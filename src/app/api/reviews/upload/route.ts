import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { rateLimiters, getClientIp, checkRateLimit } from '@/lib/ratelimit';
import { uploadToR2, getR2PublicBaseUrl } from '@/lib/r2';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const { allowed, retryAfter } = await checkRateLimit(
      rateLimiters.reviews,
      ip,
      'reviews-upload'
    );

    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Prea multe cereri de încărcare. Vă rugăm să așteptați.', retryAfter },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Niciun fișier furnizat.' }, { status: 400 });
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

    // Inspect magic bytes / file header to block HTML/SVG/script files spoofing image MIME types
    const headerSlice = new Uint8Array(await file.slice(0, 256).arrayBuffer());
    const headerText = Buffer.from(headerSlice).toString('utf8').toLowerCase();
    if (
      headerText.includes('<svg') ||
      headerText.includes('<html') ||
      headerText.includes('<script') ||
      headerText.includes('<!doctype') ||
      headerText.includes('<?xml')
    ) {
      return NextResponse.json(
        { success: false, error: 'Conținutul fișierului nu este o imagine raster validă.' },
        { status: 400 }
      );
    }

    const cleanExt = rawExt;
    const fileName = `reviews/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;

    // 1. Prefer Cloudflare R2 if configured
    const r2Base = getR2PublicBaseUrl();
    if (process.env.R2_BUCKET_NAME && r2Base) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const r2Url = await uploadToR2(buffer, fileName, file.type || `image/${cleanExt}`);
      return NextResponse.json({
        success: true,
        url: r2Url
      });
    }

    // 2. Fallback to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('review-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (uploadError) {
      console.error('Error uploading review image to storage:', uploadError);
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
