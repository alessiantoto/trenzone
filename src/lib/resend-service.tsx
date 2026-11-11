import { Resend } from 'resend';
import { EmailTemplate } from '../components/email/EmailTemplate';
import { ReviewEmailTemplate } from '../components/email/ReviewEmailTemplate';
import { BroadcastEmailTemplate } from '../components/email/BroadcastEmailTemplate';
import { WelcomeDiscountEmail } from '../components/email/WelcomeDiscountEmail';
import { AwbEmailTemplate } from '../components/email/AwbEmailTemplate';
import { ReturnConfirmationEmail } from '../components/email/ReturnConfirmationEmail';
import { AffiliateApprovalEmail } from '../components/email/AffiliateApprovalEmail';
import { FulfillmentDispatchEmail } from '../components/email/FulfillmentDispatchEmail';
import { FulfillmentOrderSummary } from '@/types/fulfillment';
import * as React from 'react';
import { supabaseAdmin } from './supabase-admin';
import { getProductsServer } from '../app/actions/products';
import { getProductPrice } from '@/utils/pricing';
import { resolveItemImage } from './product-images';

export const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

async function logEmailToDb(
  recipient: string,
  subject: string,
  type: string,
  status: 'sent' | 'failed',
  errorMessage: string | null = null,
  metadata: any = {}
) {
  try {
    await supabaseAdmin.from('email_logs').insert([{
      recipient,
      subject,
      type,
      status,
      error_message: errorMessage,
      metadata
    }]);
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}
/**
 * SEND BROADCAST EMAIL (CAMPAIGNS)
 * Handles sending a marketing email to a list of recipients.
 * Optimized for marketing broadcasts.
 */
export async function sendBroadcastBatch(
  recipients: string[],
  subject: string,
  content: {
    title: string;
    message: string;
    ctaText?: string;
    ctaLink?: string;
    imageUrl?: string;
    locale: 'ro' | 'en';
  }
) {
  console.log(`📡 [MAIL SERVICE] Broadcasting to ${recipients.length} recipients...`);
  try {
    const result = await resend.emails.send({
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: recipients,
      subject: subject,
      react: (
        <BroadcastEmailTemplate
          title={content.title}
          message={content.message}
          ctaText={content.ctaText}
          ctaLink={content.ctaLink}
          imageUrl={content.imageUrl}
          locale={content.locale}
          userEmail={recipients.join(', ')}
        />
      ),
    });

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Broadcast Batch FAILED:', result.error);
      await logEmailToDb(recipients.join(','), subject, 'broadcast', 'failed', result.error.message, { content });
      throw result.error;
    }

    await logEmailToDb(recipients.join(','), subject, 'broadcast', 'sent', null, { content });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] Broadcast Error:', err instanceof Error ? err.message : err);
    await logEmailToDb(recipients.join(','), subject, 'broadcast', 'failed', err instanceof Error ? err.message : String(err), { content });
    throw err;
  }
}

export async function sendWelcomeEmail(
  to: string,
  customerName: string,
  locale: 'ro' | 'en'
) {
  try {
    const { data: template } = await supabaseAdmin.from('email_templates').select('*').eq('id', 'welcome-discount').single();

    const { data: setting } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'welcome_email_coupon').single();
    const couponCode = setting?.value || 'TRENZONE10';

    const { data: couponData } = await supabaseAdmin.from('coupons').select('value').eq('code', couponCode).single();
    const couponValue = couponData?.value || 10;

    const defaultSubject = locale === 'en' 
      ? `Welcome to the TrenZone Crew! Here's your gift...`
      : `Bun venit în Echipa TrenZone! Iată cadoul tău...`;
      
    const subject = template ? (locale === 'en' ? template.subject_en : template.subject_ro) || defaultSubject : defaultSubject;

    const result = await resend.emails.send({
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [to],
      subject: subject,
      react: (
        <WelcomeDiscountEmail
          customerName={customerName}
          locale={locale}
          templateData={template}
          userEmail={to}
          couponCode={couponCode}
          couponValue={couponValue}
        />
      ),
    });

    if (result.error) {
      await logEmailToDb(to, subject, 'welcome-discount', 'failed', result.error.message, { customerName, locale });
      throw result.error;
    }
    
    await logEmailToDb(to, subject, 'welcome-discount', 'sent', null, { customerName, locale });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] Welcome Email FAILED:', err instanceof Error ? err.message : err);
    await logEmailToDb(to, 'Welcome Email', 'welcome-discount', 'failed', err instanceof Error ? err.message : String(err), { customerName, locale });
    throw err;
  }
}

export async function sendReviewDiscountEmail(
  to: string,
  customerName: string,
  locale: 'ro' | 'en',
  couponCode: string,
  couponValue: number
) {
  try {
    const { data: template } = await supabaseAdmin.from('email_templates').select('*').eq('id', 'review-discount').single();

    const defaultSubject = locale === 'en' 
      ? `Thank you for your review! Here is your 10% discount`
      : `Mulțumim pentru recenzie! Iată reducerea ta de 10%`;
      
    const subject = template ? (locale === 'en' ? template.subject_en : template.subject_ro) || defaultSubject : defaultSubject;

    const result = await resend.emails.send({
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [to],
      subject: subject,
      react: (
        <WelcomeDiscountEmail
          customerName={customerName}
          locale={locale}
          templateData={template}
          userEmail={to}
          couponCode={couponCode}
          couponValue={couponValue}
        />
      ),
    });

    if (result.error) {
      await logEmailToDb(to, subject, 'review-discount', 'failed', result.error.message, { customerName, locale });
      throw result.error;
    }
    
    await logEmailToDb(to, subject, 'review-discount', 'sent', null, { customerName, locale });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] Review Discount Email FAILED:', err instanceof Error ? err.message : err);
    await logEmailToDb(to, 'Review Discount', 'review-discount', 'failed', err instanceof Error ? err.message : String(err), { customerName, locale });
    throw err;
  }
}

export async function sendOrderConfirmationEmail(
  to: string,
  orderData: any,
  invoiceBuffer?: Buffer
) {
  console.log(`📡 [MAIL SERVICE] Preparing confirmation email for: ${to}`);
  console.log(`📦 [MAIL SERVICE] Order ID: ${orderData.id}`);

  let emailType = 'order-confirmation';

  try {
    const locale = orderData.locale || 'ro';
    const isPreorderOrder = Boolean(orderData.isPreorder) || 
      orderData.status === 'preorder' || 
      Boolean(orderData.carrier_metadata?.is_preorder) || 
      (orderData.items || []).some((i: any) => {
        if (i.stock_status === 'preorder' || i.is_preorder) return true;
        if (i.selectedVariant?.stock_status === 'preorder') return true;
      if (i.variants?.options) {
        const opt = i.variants.options.find((o: any) => {
          const optRo = typeof o.name === 'object' ? o.name.ro : o.name;
          const optEn = typeof o.name === 'object' ? o.name.en : o.name;
          const v = i.selectedVariant?.name || i.variant;
          const vName = typeof v === 'object' ? (v.ro || v.en || '') : String(v || '');
          return optRo === vName || optEn === vName;
        });
        if (opt?.stock_status === 'preorder') return true;
      }
      return false;
    });

    const templateId = isPreorderOrder ? 'preorder-confirmation' : 'order-confirmation';
    emailType = isPreorderOrder ? 'preorder-confirmation' : 'order-confirmation';

    const { data: template } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .maybeSingle();

    const defaultSubject = isPreorderOrder
      ? (locale === 'en' 
          ? `Pre-order #${orderData.id} Confirmed - Spot Reserved! ⏳`
          : `Precomanda ta TrenZone #${orderData.id} a fost confirmată! ⏳`)
      : (locale === 'en' 
          ? `Order #${orderData.id} Confirmed - Welcome to the TrenZone family!`
          : `Comanda ta TrenZone #${orderData.id} a fost confirmată!`);
      
    const subject = template ? (locale === 'en' ? template.subject_en : template.subject_ro)?.replace('{{id}}', orderData.id) || defaultSubject : defaultSubject;

    let upsellProducts: any[] = [];
    try {
      const allProducts = await getProductsServer();
      const orderedIds = new Set((orderData.items || []).map((i: any) => i.id).filter(Boolean));
      const SUPABASE_BASE = 'https://www.trenzone.fit';
      upsellProducts = allProducts
        .filter((p: any) => !orderedIds.has(p.id))
        .slice(0, 2)
        .map((p: any) => ({
          ...p,
          image: p.image?.startsWith('http') ? p.image : `${SUPABASE_BASE}${p.image}`
        }));
    } catch (e) {
      console.warn("Failed to fetch upsell products for email", e);
    }

    const IS_DEV = process.env.NODE_ENV === 'development';
    const actualRecipient = to;

    const rawItemsSum = (orderData.items || []).reduce(
      (sum: number, it: any) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1),
      0
    );
    const isAlreadyConverted = Math.abs(rawItemsSum - (Number(orderData.subtotal) || 0)) < 0.5;

    const getItemUnitPrice = (it: any) => {
      const rawPrice = Number(it.price) || 0;
      if (orderData.currency === 'RON' || isAlreadyConverted) {
        return rawPrice;
      }
      return getProductPrice(rawPrice, orderData.currency);
    };

    const payload: any = {
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [actualRecipient],


      replyTo: 'trenzone483@gmail.com',
      subject: IS_DEV ? `[TEST → ${to}] ${subject}` : subject,
      react: (
        <EmailTemplate
          orderId={orderData.id}
          customerName={orderData.customer.name || `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`.trim() || 'TrenZone'}
          totalAmount={Number(orderData.total).toFixed(2)}
          locale={locale}
          currency={orderData.currency}
          trackingNumber={orderData.trackingNumber}
          templateData={template}
          userEmail={to}
          items={(orderData.items || []).map((i: any) => {
            let name = typeof i.name === 'object'
              ? (i.name[locale] || i.name['ro'] || i.name['en'] || (locale === 'en' ? 'Product' : 'Produs'))
              : (i.name || (locale === 'en' ? 'Product' : 'Produs'));

            const variantRaw = i.selectedVariant?.name || i.variant || null;
            const variantStr = typeof variantRaw === 'object' && variantRaw !== null
              ? (variantRaw[locale] || variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
              : (variantRaw || '');

            const hasVariantInName = variantStr && (
              name.includes(`(${variantStr})`) || 
              name.toLowerCase().includes(`(${variantStr.toLowerCase()})`)
            );

            if (variantStr && !hasVariantInName) {
              name = `${name} (${variantStr})`;
            }

            const itemImage = resolveItemImage({ ...i, name, variant: variantStr });
            const finalImage = itemImage.startsWith('/') ? `https://www.trenzone.fit${itemImage}` : itemImage;
            const unitPrice = getItemUnitPrice(i);

            return {
              name,
              slug: i.slug || "",
              quantity: i.quantity || 1,
              price: unitPrice.toFixed(2),
              image: finalImage
            };
          })}
          upsellProducts={upsellProducts}
          subtotal={orderData.subtotal}
          discount={orderData.discount || orderData.discount_total}
          cardDiscount={orderData.cardDiscount || orderData.carrier_metadata?.card_discount || 0}
          shipping={orderData.shipping}
          priorityProcessing={orderData.priorityProcessing}
          priorityCost={(orderData as any).priorityCost || (orderData as any).priorityProcessingAmount}
          giftPackaging={orderData.giftPackaging}
          giftCost={(orderData as any).giftCost || (orderData as any).giftPackagingAmount}
          giftMessage={orderData.giftMessage}
          isPreorder={isPreorderOrder}
        />
      ),
    };

    if (!process.env.RESEND_API_KEY) {
      console.error('❌ [MAIL SERVICE] CRITICAL: RESEND_API_KEY is missing from environment variables!');
      throw new Error('RESEND_API_KEY not configured');
    }

    if (invoiceBuffer && invoiceBuffer.length > 0) {
      console.log(`📎 [MAIL SERVICE] Attaching invoice PDF (${(invoiceBuffer.length / 1024).toFixed(2)} KB)...`);
      const customerName = (orderData.customer.name || `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`).trim();
      const safeCustomerName = customerName.replace(/\s+/g, '_').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const safeOrderId = orderData.id.replace('-', '');
      
      payload.attachments = [
        {
          filename: `${locale === 'en' ? 'Invoice' : 'Factura'}-${safeOrderId}-${safeCustomerName}.pdf`,
          content: invoiceBuffer,
        },
      ];
    } else {
      console.warn('⚠️ [MAIL SERVICE] No invoice buffer provided, sending without attachment.');
    }

    console.log('📨 [MAIL SERVICE] Resend Payload Brief:', {
      to: payload.to,
      subject: payload.subject,
      itemsCount: orderData.items?.length,
      hasAttachment: !!invoiceBuffer,
      attachmentSize: invoiceBuffer?.length || 0
    });

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Resend API REJECTION:', {
        error: result.error,
        orderId: orderData.id,
        recipient: to
      });
      await logEmailToDb(actualRecipient, payload.subject, emailType, 'failed', result.error.message, { orderData });
      throw result.error;
    }

    console.log('✅ [MAIL SERVICE] Resend ACCEPTED:', {
      id: result.data?.id,
      orderId: orderData.id
    });
    
    await logEmailToDb(actualRecipient, payload.subject, emailType, 'sent', null, { orderData });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] CRITICAL FLOW FAILURE:', {
      message: err instanceof Error ? err.message : err,
      orderId: orderData.id,
      stack: err instanceof Error ? err.stack?.substring(0, 300) : undefined
    });
    const fallbackType = typeof emailType !== 'undefined' ? emailType : 'order-confirmation';
    await logEmailToDb(to, 'Order Confirmation', fallbackType, 'failed', err instanceof Error ? err.message : String(err), { orderData });
    throw err;
  }
}

export async function sendReviewEmail(
  to: string,
  orderData: any
) {
  console.log(`📡 [MAIL SERVICE] Sending Review Request for: ${to}`);

  try {
    const { data: template } = await supabaseAdmin.from('email_templates').select('*').eq('id', 'review-request').single();
    
    const defaultSubject = orderData.locale === 'en' 
      ? `How was your experience, Champion?`
      : `Cum a fost experiența ta, Campionule?`;
      
    const subject = template ? (orderData.locale === 'en' ? template.subject_en : template.subject_ro) || defaultSubject : defaultSubject;

    const payload = {
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [to],
      subject: subject,
      react: (
        <ReviewEmailTemplate
          orderId={orderData.id}
          customerName={orderData.customer?.name || orderData.customer_name || 'Client'}
          locale={orderData.locale || 'ro'}
          items={orderData.items}
          templateData={template}
          userEmail={to}
        />
      ),
    };

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Review Resend API Error:', result.error);
      await logEmailToDb(to, subject, 'review-request', 'failed', result.error.message, { orderData });
      throw result.error;
    }

    await logEmailToDb(to, subject, 'review-request', 'sent', null, { orderData });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] Review Email FAILED:', err instanceof Error ? err.message : err);
    await logEmailToDb(to, 'Review Request', 'review-request', 'failed', err instanceof Error ? err.message : String(err), { orderData });
    throw err;
  }
}

export async function sendAwbTrackingEmail(
  to: string,
  orderData: any,
  trackingNumber: string,
  courier: 'sameday' | 'packeta'
) {
  console.log(`📡 [MAIL SERVICE] Sending AWB Tracking Email for: ${to}`);

  try {
    const locale = orderData.locale || 'ro';
    
    // Fetch template from Supabase
    const { data: templateData } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', 'awb-tracking')
      .single();

    const subjectText = locale === 'en' ? templateData?.subject_en : templateData?.subject_ro;
    let subject = subjectText || (locale === 'en' 
      ? `Your TrenZone Order #${orderData.id} has been shipped!`
      : `Comanda ta TrenZone #${orderData.id} a fost expediată!`);
      
    subject = subject.replace('{{id}}', String(orderData.id));

    const payload = {
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [to],
      subject: subject,
      react: (
        <AwbEmailTemplate
          orderId={orderData.id}
          customerName={orderData.customer.name || `${orderData.customer.firstName || ''} ${orderData.customer.lastName || ''}`.trim() || 'TrenZone'}
          trackingNumber={trackingNumber}
          courier={courier}
          locale={locale}
          userEmail={to}
          templateData={templateData}
        />
      ),
    };

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('❌ [MAIL SERVICE] AWB Tracking Resend API Error:', result.error);
      await logEmailToDb(to, subject, 'awb-tracking', 'failed', result.error.message, { orderData, trackingNumber, courier });
      throw result.error;
    }

    await logEmailToDb(to, subject, 'awb-tracking', 'sent', null, { orderData, trackingNumber, courier });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] AWB Tracking Email FAILED:', err instanceof Error ? err.message : err);
    await logEmailToDb(to, 'AWB Tracking', 'awb-tracking', 'failed', err instanceof Error ? err.message : String(err), { orderData, trackingNumber, courier });
    throw err;
  }
}

export async function sendReturnConfirmationEmail(
  to: string,
  orderId: string,
  customerName: string,
  locale: 'ro' | 'en'
) {
  console.log(`📡 [MAIL SERVICE] Sending Return Confirmation Email for: ${to}`);

  try {
    const { data: templateData } = await supabaseAdmin
      .from('email_templates')
      .select('*')
      .eq('id', 'return-confirmation')
      .single();

    const subjectText = locale === 'en' ? templateData?.subject_en : templateData?.subject_ro;
    let subject = subjectText || (locale === 'en' 
      ? `We received your return request for order ${orderId}`
      : `Am primit cererea ta de retur pentru comanda ${orderId}`);
      
    subject = subject.replace('{{id}}', String(orderId));

    const payload = {
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: [to],
      subject: subject,
      react: (
        <ReturnConfirmationEmail
          orderId={orderId}
          customerName={customerName}
          locale={locale}
          userEmail={to}
          templateData={templateData}
        />
      ),
    };

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Return Confirmation Resend API Error:', result.error);
      await logEmailToDb(to, subject, 'return-confirmation', 'failed', result.error.message, { orderId, customerName, locale });
      throw result.error;
    }

    await logEmailToDb(to, subject, 'return-confirmation', 'sent', null, { orderId, customerName, locale });
    return result.data;
  } catch (err) {
    console.error('❌ [MAIL SERVICE] Return Confirmation Email FAILED:', err instanceof Error ? err.message : err);
    await logEmailToDb(to, 'Return Confirmation', 'return-confirmation', 'failed', err instanceof Error ? err.message : String(err), { orderId, customerName, locale });
    throw err;
  }
}

/**
 * SEND AFFILIATE APPROVAL EMAIL
 */
export async function sendAffiliateApprovalEmail(
  email: string,
  name: string,
  code: string,
  locale: 'ro' | 'en',
  loginUrl: string,
  commission: number
) {
  const subject = locale === 'ro' 
    ? 'Aplicația ta de afiliat a fost aprobată!' 
    : 'Your affiliate application has been approved!';

  console.log(`📡 [MAIL SERVICE] Sending affiliate approval to ${email}`);
  
  try {
    const result = await resend.emails.send({
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: email,
      subject,
      react: (
        <AffiliateApprovalEmail 
          name={name} 
          code={code} 
          locale={locale} 
          loginUrl={loginUrl}
          commission={commission}
        />
      ),
    });

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Affiliate Approval FAILED:', result.error);
      await logEmailToDb(email, subject, 'affiliate-approval', 'failed', result.error.message, { name, code, locale, loginUrl });
      throw result.error;
    }

    console.log(`✅ [MAIL SERVICE] Affiliate Approval sent to ${email}`);
    await logEmailToDb(email, subject, 'affiliate-approval', 'sent', null, { name, code, locale, loginUrl });
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ [MAIL SERVICE] Exception:', error);
    await logEmailToDb(email, 'Affiliate Approval', 'affiliate-approval', 'failed', error instanceof Error ? error.message : String(error), { name, code, locale, loginUrl, commission });
    throw error;
  }
}

/**
 * SEND AFFILIATE UPDATE EMAIL
 */
export async function sendAffiliateUpdateEmail(
  email: string,
  name: string,
  code: string,
  locale: 'ro' | 'en',
  loginUrl: string,
  commission: number
) {
  const subject = locale === 'ro' 
    ? 'Actualizare profil afiliat TrenZone' 
    : 'TrenZone Affiliate Profile Update';

  console.log(`📡 [MAIL SERVICE] Sending affiliate update to ${email}`);
  
  try {
    const result = await resend.emails.send({
      from: 'TrenZone <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: email,
      subject,
      react: (
        <AffiliateApprovalEmail 
          name={name} 
          code={code} 
          locale={locale} 
          loginUrl={loginUrl}
          commission={commission}
          isUpdate={true}
        />
      ),
    });

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Affiliate Update FAILED:', result.error);
      await logEmailToDb(email, subject, 'affiliate-update', 'failed', result.error.message, { name, code, locale, loginUrl, commission });
      throw result.error;
    }

    console.log(`✅ [MAIL SERVICE] Affiliate Update sent to ${email}`);
    await logEmailToDb(email, subject, 'affiliate-update', 'sent', null, { name, code, locale, loginUrl, commission });
    return { success: true, id: result.data?.id };
  } catch (error) {
    console.error('❌ [MAIL SERVICE] Exception:', error);
    await logEmailToDb(email, 'Affiliate Update', 'affiliate-update', 'failed', error instanceof Error ? error.message : String(error), { name, code, locale, loginUrl, commission });
    throw error;
  }
}

/**
 * BUILD HIGH-CLARITY FULFILLMENT EMAIL SUBJECT LINE
 * Example: "[TrenZone] 📦 Comenzi de Expediat — 01.11.2026 • 7 Comenzi (12 Articole) • 🇷🇴 5 RO · 🇪🇺 2 INT [08:00 AM]"
 */
export function buildFulfillmentDispatchSubject(params: {
  ordersCount: number;
  totalItemsCount: number;
  sentAt?: string | Date;
  trigger?: 'manual' | 'scheduled_8am';
  roCount?: number;
  intCount?: number;
}): string {
  const dateObj = params.sentAt ? new Date(params.sentAt) : new Date();
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  const dateStr = `${day}.${month}.${year}`;

  const triggerLabel = params.trigger === 'scheduled_8am' ? '08:00 AM' : 'Manual';
  
  // Country badge
  let countryPart = '';
  if (params.roCount !== undefined && params.intCount !== undefined) {
    if (params.roCount > 0 && params.intCount > 0) {
      countryPart = ` • 🇷🇴 ${params.roCount} RO · 🇪🇺 ${params.intCount} INT`;
    } else if (params.intCount > 0) {
      countryPart = ` • 🇪🇺 ${params.intCount} Internațional`;
    } else if (params.roCount > 0) {
      countryPart = ` • 🇷🇴 România`;
    }
  }

  const orderWord = params.ordersCount === 1 ? 'comandă' : 'comenzi';
  const itemWord = params.totalItemsCount === 1 ? 'articol' : 'articole';

  return `[TrenZone] 📦 Comenzi de Expediat — ${dateStr} • ${params.ordersCount} ${orderWord} (${params.totalItemsCount} ${itemWord})${countryPart} [${triggerLabel}]`;
}

/**
 * SEND FULFILLMENT DISPATCH EMAIL
 * Sends the list of pending orders to the fulfillment center warehouse for packaging & shipping.
 * Also sends a CC copy to secondary verification email if configured.
 */
export async function sendFulfillmentDispatchEmail(
  toEmail: string,
  data: {
    orders: FulfillmentOrderSummary[];
    sentAt: string;
    trigger?: 'manual' | 'scheduled_8am';
    notes?: string;
    csvContent?: string;
    csvFilename?: string;
    secondaryEmail?: string;
    subject?: string;
  }
) {
  const count = data.orders.length;
  const totalItems = data.orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
  const roCount = data.orders.filter(o => {
    const c = (o.country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  }).length;
  const intCount = count - roCount;

  const subject = data.subject || buildFulfillmentDispatchSubject({
    ordersCount: count,
    totalItemsCount: totalItems,
    sentAt: data.sentAt,
    trigger: data.trigger,
    roCount,
    intCount
  });

  const secondaryRecipient = data.secondaryEmail?.trim() || null;
  const loggedRecipient = secondaryRecipient ? `${toEmail} (CC: ${secondaryRecipient})` : toEmail;

  console.log(`📡 [MAIL SERVICE] Sending fulfillment dispatch (${count} orders) to ${toEmail}${secondaryRecipient ? ` [CC: ${secondaryRecipient}]` : ''}...`);

  try {
    const payload: any = {
      from: 'TrenZone Fulfillment <contact@trenzone.fit>',
      reply_to: 'trenzone483@gmail.com',
      to: toEmail,
      subject,
      react: (
        <FulfillmentDispatchEmail
          orders={data.orders}
          sentAt={data.sentAt}
          trigger={data.trigger || 'manual'}
          notes={data.notes}
          csvAttached={Boolean(data.csvContent)}
          secondaryEmail={secondaryRecipient || undefined}
        />
      ),
    };

    if (secondaryRecipient) {
      payload.cc = [secondaryRecipient];
    }

    if (data.csvContent) {
      payload.attachments = [
        {
          filename: data.csvFilename || `comenzi_trenzone_${new Date().toISOString().split('T')[0]}.csv`,
          content: Buffer.from(data.csvContent, 'utf-8').toString('base64'),
        }
      ];
    }

    const result = await resend.emails.send(payload);

    if (result.error) {
      console.error('❌ [MAIL SERVICE] Fulfillment dispatch email FAILED:', result.error);
      await logEmailToDb(loggedRecipient, subject, 'fulfillment-dispatch', 'failed', result.error.message, {
        order_count: count,
        order_ids: data.orders.map(o => o.id),
        secondary_email: secondaryRecipient
      });
      return { success: false, error: result.error.message, subject };
    }

    console.log(`✅ [MAIL SERVICE] Fulfillment dispatch email sent successfully to ${toEmail}${secondaryRecipient ? ` and CC to ${secondaryRecipient}` : ''}`);
    await logEmailToDb(loggedRecipient, subject, 'fulfillment-dispatch', 'sent', null, {
      order_count: count,
      order_ids: data.orders.map(o => o.id),
      secondary_email: secondaryRecipient,
      resend_id: result.data?.id
    });

    return { success: true, id: result.data?.id, subject };
  } catch (error: any) {
    console.error('❌ [MAIL SERVICE] Exception in sendFulfillmentDispatchEmail:', error);
    await logEmailToDb(loggedRecipient, subject, 'fulfillment-dispatch', 'failed', error.message || String(error), {
      order_count: count,
      order_ids: data.orders.map(o => o.id),
      secondary_email: secondaryRecipient
    });
    return { success: false, error: error.message || 'Eroare la trimiterea emailului', subject };
  }
}

