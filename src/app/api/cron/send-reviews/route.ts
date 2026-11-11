import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { sendReviewEmail } from '@/lib/resend-service';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

export async function GET(request: Request) {
  // 1. Verificare Securitate (CRON_SECRET sau Admin autentificat)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Calculăm data de acum 7 zile
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString();

    // 2. Fetch orders:
    // - au AWB (tracking_number nu este null)
    // - au fost create acum > 7 zile
    // - nu li s-a trimis deja email de recenzie
    // - nu sunt anulate
    const { data: eligibleOrders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .not('tracking_number', 'is', null)
      .neq('status', 'cancelled')
      .lt('created_at', dateString)
      .is('review_email_sent', false)
      .limit(50); // limităm la 50 per rulare pentru a evita timeout-uri

    if (fetchError) {
      // Dacă dă eroare, probabil lipsește coloana review_email_sent
      console.error('Error fetching orders for review:', fetchError);
      return NextResponse.json({ error: 'DB Fetch Error', details: fetchError }, { status: 500 });
    }

    if (!eligibleOrders || eligibleOrders.length === 0) {
      return NextResponse.json({ message: 'No eligible orders found to send reviews.' });
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as any[]
    };

    // 3. Trimitem email-urile
    for (const order of eligibleOrders) {
      if (!order.customer_email) continue;

      try {
        const orderLocale =
          order.carrier_metadata?.locale ||
          (order as any).locale ||
          (order.addr_country && String(order.addr_country).toUpperCase() !== 'RO' ? 'en' : 'ro');
        const orderData = {
          id: order.id,
          locale: orderLocale,
          customer: { name: order.customer_name || order.customer_firstname || 'TrenZone' },
          items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
        };

        // Trimite email prin Resend
        await sendReviewEmail(order.customer_email, orderData);

        // Marchează ca trimis
        await supabaseAdmin
          .from('orders')
          .update({ review_email_sent: true })
          .eq('id', order.id);

        results.sent++;
      } catch (err: any) {
        console.error(`Failed to send review for order ${order.id}:`, err);
        results.failed++;
        results.errors.push({ id: order.id, error: err.message });
      }
    }

    return NextResponse.json({
      message: 'Review cron job finished.',
      results
    });

  } catch (error: any) {
    console.error('Cron job review error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
