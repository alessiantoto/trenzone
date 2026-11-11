import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendReviewDiscountEmail, resend } from '@/lib/resend-service';
import { rateLimiters, getClientIp, checkRateLimit } from '@/lib/ratelimit';

import { getAllReviewsServer } from '@/app/actions/public-reviews';
import { formatPublicReviews } from '@/lib/utils/reviews';

// Cache public GET reviews for 24h on Vercel/Cloudflare CDN (POST stays uncached; admin edits call revalidateTag/revalidatePath)
export const revalidate = 86400;

export async function GET() {
  try {
    const rawReviews = await getAllReviewsServer();
    const reviews = formatPublicReviews(rawReviews, 40);

    return NextResponse.json(
      { reviews },
      {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
          'CDN-Cache-Control': 'public, s-maxage=86400',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 1. Rate limiting check
    const ip = getClientIp(request);
    const { allowed, retryAfter, headers: rlHeaders } = await checkRateLimit(
      rateLimiters.reviews,
      ip,
      'reviews'
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'Prea multe recenzii trimise. Vă rugăm să încercați mai târziu.', retryAfter },
        { status: 429, headers: rlHeaders }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reqLocale = body?.locale === 'en' ? 'en' : 'ro';
    
    // 2. Validate required fields
    if (!body.name || !body.text || typeof body.rating !== 'number') {
      return NextResponse.json(
        { error: reqLocale === 'en' ? 'Required fields are missing.' : 'Câmpurile obligatorii lipsesc.' },
        { status: 400 }
      );
    }

    const rating = Math.min(5, Math.max(1, Math.round(body.rating)));
    const name = String(body.name).trim().slice(0, 100);
    const text = String(body.text).trim().slice(0, 2000);
    const email = body.email ? String(body.email).trim().toLowerCase().slice(0, 150) : null;
    const { images, product_id, locale } = body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: reqLocale === 'en' ? 'Invalid email address.' : 'Adresă de email invalidă.' },
        { status: 400 }
      );
    }

    // Resolve valid UUID for product_id to prevent PostgreSQL syntax errors
    const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    let resolvedProductId: string = '2fd4ee73-6800-4f76-a74d-208fffea0fb6'; // default X10
    if (product_id && typeof product_id === 'string' && isUuid(product_id)) {
      resolvedProductId = product_id;
    } else if (product_id && typeof product_id === 'string' && product_id.toLowerCase().includes('x5')) {
      resolvedProductId = '997b3e3c-511b-4e02-8a58-7d59bbf5a154'; // X5
    }

    // 3. Insert review strictly as 'pending' (NOT visible until approved by admin)
    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert([
        {
          customer_name: name,
          email,
          comment: text,
          rating,
          images: Array.isArray(images) ? images.slice(0, 5) : [],
          product_id: resolvedProductId,
          locale: locale === 'en' ? 'en' : 'ro',
          status: 'pending'
        }
      ])
      .select('id')
      .single();

    if (error) {
      console.error("❌ [REVIEWS API] Error inserting review:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [REVIEWS API] New review saved with status PENDING (id: ${data?.id})`);

    // 4. Send discount email to customer if email provided
    let generatedCoupon = '';
    if (email) {
      const uniqueCode = `REVIEW10-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const couponValue = 10;
      generatedCoupon = uniqueCode;

      await supabaseAdmin.from('coupons').insert({
        code: uniqueCode,
        description: `Reducere 10% acordată pentru recenzia lui ${name}`,
        type: 'percentage',
        value: couponValue,
        usage_limit: 1,
        is_active: true,
        used_count: 0
      });

      try {
        const reqLocale = (locale === 'en' ? 'en' : 'ro') as 'ro' | 'en';
        await sendReviewDiscountEmail(email, name || (reqLocale === 'en' ? 'Champion' : 'Campionule'), reqLocale, uniqueCode, couponValue);
        console.log(`✅ [REVIEWS API] Discount email sent to customer: ${email}`);
      } catch (err) {
        console.error("⚠️ [REVIEWS API] Error sending review discount email to customer:", err);
      }
    }

    // 5. Notify store administrator about new review awaiting moderation
    try {
      const escapeHtml = (str: string) =>
        String(str || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const safeName = escapeHtml(name);
      const cleanSubjectName = String(name || '').replace(/[\r\n]+/g, ' ').trim();
      const safeEmail = escapeHtml(email || 'Nespecificat');
      const safeText = escapeHtml(text);

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'TrenZone Alerts <onboarding@resend.dev>',
        to: ['trenzone483@gmail.com'],
        reply_to: email || 'trenzone483@gmail.com',
        subject: `[Recenzie Nouă În Așteptare] ${rating}★ de la ${cleanSubjectName}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eaeaea; border-radius: 16px; background: #ffffff;">
            <div style="background: #000000; padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 24px;">
              <img src="https://www.trenzone.fit/images/logos/trenzone_logo.webp" alt="TrenZone" style="height: 40px; object-fit: contain; margin: 0 auto;" />
            </div>
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; text-transform: uppercase; margin-top: 0; margin-bottom: 8px;">
              ⭐ Recenzie Nouă Primită (Status: În Așteptare)
            </h2>
            <p style="color: #64748b; font-size: 14px; margin-top: 0; margin-bottom: 20px; line-height: 1.5;">
              Un client a lăsat o nouă recenzie pe site. Aceasta <strong>nu este vizibilă public</strong> pe site până nu apeși <strong>Aprobă</strong> în panoul de administrare.
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; background: #f8fafc; border-radius: 10px; padding: 12px;">
              <tr>
                <td style="padding: 10px; color: #64748b; width: 130px; font-weight: bold;">Client:</td>
                <td style="padding: 10px; color: #0f172a; font-weight: bold;">${safeName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #64748b; font-weight: bold;">Email:</td>
                <td style="padding: 10px; color: #0f172a;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #64748b; font-weight: bold;">Rating:</td>
                <td style="padding: 10px; color: #f59e0b; font-weight: bold;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #64748b; font-weight: bold;">Poze atașate:</td>
                <td style="padding: 10px; color: #0f172a;">${Array.isArray(images) ? images.length : 0} poze</td>
              </tr>
              ${generatedCoupon ? `
              <tr>
                <td style="padding: 10px; color: #64748b; font-weight: bold;">Cupon 10%:</td>
                <td style="padding: 10px; color: #e32f8c; font-weight: bold;">${generatedCoupon} (trimis pe email)</td>
              </tr>` : ''}
            </table>
            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid #e32f8c; padding: 16px; border-radius: 8px; font-size: 14px; color: #1e293b; margin-bottom: 24px; line-height: 1.6; white-space: pre-wrap;">${safeText}</div>
            <div style="text-align: center;">
              <a href="https://www.trenzone.fit/admin/reviews" style="display: inline-block; background: #000000; color: #ffffff; text-decoration: none; padding: 14px 32px; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 10px;">
                Moderează în Panoul Admin
              </a>
            </div>
          </div>
        `
      });
      console.log(`✅ [REVIEWS API] Admin notification email sent to trenzone483@gmail.com`);
    } catch (adminErr) {
      console.error("⚠️ [REVIEWS API] Admin notification error:", adminErr);
    }

    return NextResponse.json({ success: true, review: data });
  } catch (error: any) {
    console.error("❌ [REVIEWS API] Exception in POST:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
