import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { resend } from '@/lib/resend-service';
import { AbandonedCartEmail } from '@/components/email/AbandonedCartEmail';
import { getEmailTemplate } from '@/app/actions/email-templates';
import { isAdminAuthorized } from '@/app/actions/admin-auth';

// For Vercel Cron
export const maxDuration = 60; // seconds

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  const isVercelSecret = Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
  const isAuthorizedAdmin = await isAdminAuthorized().catch(() => false);

  if (!isVercelSecret && !isAuthorizedAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    
    // Limits for querying: from 120h ago (5 days) up to 23h ago
    // Limits for querying: from 120h ago (5 days) up to 24h ago (preventing premature sends)
    const lowerBound = new Date(now.getTime() - (120 * 60 * 60 * 1000));
    const upperBound = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const { data: sessions, error } = await supabaseAdmin
      .from('checkout_sessions')
      .select('*')
      .eq('status', 'initiated')
      .gte('created_at', lowerBound.toISOString())
      .lte('created_at', upperBound.toISOString());

    if (error) throw error;
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ success: true, message: "No abandoned carts found in target window.", processed: 0, emailsSent: 0 });
    }

    let emailsSent = 0;
    let emailsSent24h = 0;
    let emailsSent72h = 0;

    // Load templates once
    const template24h = await getEmailTemplate('abandoned_24h');
    const template72h = await getEmailTemplate('abandoned_72h');

    // Load 72h coupon (default ODIN10 with 10% discount)
    const { data: setting72h } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'abandoned_72h_coupon').single();
    const couponCode72h = setting72h?.value || 'TREN10';
    const { data: couponData72h } = await supabaseAdmin.from('coupons').select('value').eq('code', couponCode72h).single();
    const couponValue72h = couponData72h?.value || 10;

    for (const session of sessions) {
      if (!session.email) continue;
      
      const emailObj = session.email.toLowerCase().trim();
      
      // 1. Check if user is unsubscribed
      const { data: unsubData } = await supabaseAdmin
        .from('unsubscribed_emails')
        .select('marketing')
        .eq('email', emailObj)
        .maybeSingle();

      if (unsubData && unsubData.marketing === false) {
        continue; // User opted out of marketing
      }

      // 2. Check if they placed an order ANYTIME after this checkout session started
      const { data: recentOrder } = await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('customer_email', emailObj)
        .gte('created_at', session.created_at)
        .limit(1);

      if (recentOrder && recentOrder.length > 0) {
        // They bought something! Mark this session as recovered.
        await supabaseAdmin.from('checkout_sessions').update({ status: 'recovered' }).eq('id', session.id);
        continue;
      }

      // 3. Determine which email to send based on last activity time
      const sessionDate = new Date(session.updated_at || session.created_at);
      const hoursSince = (now.getTime() - sessionDate.getTime()) / (1000 * 60 * 60);
      
      const recoveryEmailsSent = session.recovery_emails_sent || {};
      let templateToUse = null;
      let emailType = '';

      if (hoursSince >= 72 && !recoveryEmailsSent['72h']) {
        templateToUse = template72h;
        emailType = '72h';
      } else if (hoursSince >= 24 && hoursSince < 72 && !recoveryEmailsSent['24h']) {
        templateToUse = template24h;
        emailType = '24h';
      }

      if (!templateToUse || !emailType) {
        continue; // nothing to send yet, or already sent
      }

      // Send the email
      const customerName = session.first_name || 'Prieten';
      const locale = session.country === 'RO' ? 'ro' : 'en';
      const baseSubject = locale === 'en' ? templateToUse.subject_en : templateToUse.subject_ro;
      const finalSubject = (emailType === '72h'
        ? (locale === 'en' ? `Here is your ${couponValue72h}% discount for your cart!` : `Ai ${couponValue72h}% reducere pentru produsele din coș!`)
        : baseSubject
      )
        .replace('{{name}}', customerName.split(' ')[0])
        .replace('{{coupon}}', couponCode72h)
        .replace('{{value}}', String(couponValue72h));

      let parsedItems = session.items || [];
      if (typeof parsedItems === 'string') {
        try {
          parsedItems = JSON.parse(parsedItems);
        } catch {
          parsedItems = [];
        }
      }
      if (!Array.isArray(parsedItems)) parsedItems = [];

      const cronCartUrl = `https://www.trenzone.fit/${locale}/checkout${emailType === '72h' ? `?coupon=${encodeURIComponent(couponCode72h)}` : ''}`;
      
      try {
        await resend.emails.send({
          from: 'TrenZone <contact@trenzone.fit>',
          to: emailObj,
          subject: finalSubject,
          react: AbandonedCartEmail({
            customerName,
            items: parsedItems,
            locale,
            cartUrl: cronCartUrl,
            templateData: templateToUse as any,
            userEmail: emailObj,
            couponCode: emailType === '72h' ? couponCode72h : undefined,
            couponValue: emailType === '72h' ? couponValue72h : undefined
          }) as any
        });
        
        // Update session that email was sent with timestamp and coupon details
        recoveryEmailsSent[emailType] = true;
        recoveryEmailsSent[`${emailType}_sent_at`] = new Date().toISOString();
        if (emailType === '72h') {
          recoveryEmailsSent.last_coupon_code = couponCode72h;
          recoveryEmailsSent.last_coupon_value = couponValue72h;
        }
        recoveryEmailsSent.automated = true;

        await supabaseAdmin
          .from('checkout_sessions')
          .update({ recovery_emails_sent: recoveryEmailsSent })
          .eq('id', session.id);

        emailsSent++;
        if (emailType === '24h') emailsSent24h++;
        if (emailType === '72h') emailsSent72h++;

        // Throttle 600ms to stay safely below Resend's 2 requests/second rate limit
        await new Promise(resolve => setTimeout(resolve, 600));
      } catch (emailErr) {
        console.error(`Failed to send ${emailType} email to ${emailObj}:`, emailErr);
      }
    }

    return NextResponse.json({ 
      success: true, 
      processed: sessions.length, 
      emailsSent,
      emailsSent24h,
      emailsSent72h,
      message: `Procesat cu succes: ${emailsSent} emailuri trimise (${emailsSent24h} de 24h, ${emailsSent72h} de 72h).`
    });
  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
