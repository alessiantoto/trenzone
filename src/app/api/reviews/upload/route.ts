import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIp, checkRateLimit } from '@/lib/ratelimit';
import { uploadToR2, getR2PublicBaseUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

type DetectedImageFormat = {
  ext: 'jpg' | 'png' | 'webp' | 'gif' | 'avif';
  mime: string;
};

function detectImageMagicBytes(bytes: Uint8Array): DetectedImageFormat | null {
  if (bytes.length < 12) return null;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: 'jpg', mime: 'image/jpeg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { ext: 'png', mime: 'image/png' };
  }

  // GIF87a or GIF89a
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return { ext: 'gif', mime: 'image/gif' };
  }

  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: 'webp', mime: 'image/webp' };
  }

  // AVIF / HEIF ISO BMFF: ....ftyp(avif|avis|mif1|heic)
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
      return { ext: 'avif', mime: 'image/avif' };
    }
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.reviewsUpload,
      ip,
      'reviewsUpload'
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Prea multe cereri de încărcare. Vă rugăm să așteptați.', retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || file.size <= 0) {
      return NextResponse.json({ success: false, error: 'Niciun fișier valid furnizat.' }, { status: 400 });
    }

    // Limit to 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Fișierul este prea mare (maxim 10MB).' }, { status: 400 });
    }

    // Strict content type & extension allowlist (explicitly block SVG/HTML/XML to prevent Stored XSS)
    const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']);
    const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']);

    const rawExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!ALLOWED_MIME_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(rawExt)) {
      return NextResponse.json(
        { success: false, error: 'Format de imagine nepermis. Sunt acceptate doar JPG, PNG, WebP, AVIF sau GIF.' },
        { status: 400 }
      );
    }

    // Read file bytes and validate BOTH positive raster image magic bytes and block active markup headers
    const bytes = await file.arrayBuffer();
    const byteArray = new Uint8Array(bytes);
    const headerText = Buffer.from(byteArray.subarray(0, 256)).toString('utf8').toLowerCase();
    if (
      headerText.includes('<svg') ||
      headerText.includes('<html') ||
      headerText.includes('<script') ||
      headerText.includes('<!doctype') ||
      headerText.includes('<?xml') ||
      headerText.includes('<?php')
    ) {
      return NextResponse.json(
        { success: false, error: 'Conținutul fișierului nu este o imagine raster validă.' },
        { status: 400 }
      );
    }

    const detected = detectImageMagicBytes(byteArray);
    if (!detected) {
      return NextResponse.json(
        { success: false, error: 'Semnătura fișierului nu corespunde unei imagini valide (JPG, PNG, WebP, AVIF, GIF).' },
        { status: 400 }
      );
    }

    const cleanExt = detected.ext;
    const verifiedMime = detected.mime;
    const fileName = `reviews/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

    // 1. Prefer Cloudflare R2 if configured
    const r2Base = getR2PublicBaseUrl();
    if (process.env.R2_BUCKET_NAME && r2Base) {
      const buffer = Buffer.from(bytes);
      const r2Url = await uploadToR2(buffer, fileName, verifiedMime);
      return NextResponse.json({
        success: true,
        url: r2Url
      });
    }

    // 2. Fallback to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('review-images')
      .upload(fileName, Buffer.from(bytes), {
        cacheControl: '3600',
        upsert: false,
        contentType: verifiedMime
      });

    if (uploadError) {
      console.error('Error uploading review image to storage:', uploadError);
      return NextResponse.json({ success: false, error: 'Eroare la încărcarea imaginii.' }, { status: 500 });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('review-images')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl
    });
  } catch (err: any) {
    console.error('Server error in review image upload:', err);
    return NextResponse.json({ success: false, error: 'Eroare internă la încărcarea imaginii.' }, { status: 500 });
  }
}
