/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { getMediaCdnBase } from '@/lib/utils/cdn';

interface AbandonedCartEmailProps {
  customerName: string;
  items: any[];
  locale: 'ro' | 'en';
  baseUrl?: string;
  currency?: string;
  cartUrl: string;
  templateData?: {
    heading_ro: string;
    heading_en: string;
    body_ro: string;
    body_en: string;
    cta_ro: string;
    cta_en: string;
  };
  userEmail?: string;
  couponCode?: string;
  couponValue?: number;
}

export const AbandonedCartEmail: React.FC<Readonly<AbandonedCartEmailProps>> = ({
  customerName,
  items,
  locale = 'ro',
  baseUrl = "https://www.trenzone.fit",
  currency = "RON",
  cartUrl,
  templateData,
  userEmail,
  couponCode = "",
  couponValue = 0
}) => {
  const isEn = locale === 'en';
  
  const headingText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;

  const safeHeading = (headingText || (isEn ? "You left your gear behind!" : "Ți-ai uitat produsele!")).replace('{{name}}', customerName.split(' ')[0] || '');
  
  let safeBody = (bodyText || (isEn ? "We noticed you left some items in your cart. Complete your order now." : "Am observat că ai adăugat produse excelente în coș, dar nu ai finalizat comanda."))
    .replace('{{name}}', customerName.split(' ')[0] || '');
    
  if (couponCode) {
    safeBody = safeBody
      .replace('{{coupon}}', couponCode)
      .replace('{{value}}', String(couponValue));
  }
  
  const safeCta = ctaText || (isEn ? "COMPLETE ORDER" : "FINALIZEAZĂ COMANDA");

  const staticTranslations = isEn ? {
    cart_contents: "YOUR CART",
    total: "CART TOTAL",
    unsubscribe: "Unsubscribe from marketing emails",
  } : {
    cart_contents: "PRODUSELE TALE",
    total: "TOTAL",
    unsubscribe: "Dezabonează-te de la emailuri de marketing",
  };

  const supabaseBase = getMediaCdnBase();

  let safeItems = Array.isArray(items) ? items : [];
  if (!Array.isArray(items) && typeof items === 'string') {
    try {
      safeItems = JSON.parse(items);
    } catch {
      safeItems = [];
    }
  }
  if (!Array.isArray(safeItems)) safeItems = [];

  // Calculare total (just for display in email)
  const cartTotal = safeItems.reduce((acc, item) => acc + (Number(item?.price || 0) * (item?.quantity || 1)), 0).toFixed(2);

  const cleanCoupon = (couponCode || '').trim();
  const directCartUrl = cleanCoupon && !cartUrl.includes('coupon=')
    ? `${cartUrl}${cartUrl.includes('?') ? '&' : '?'}coupon=${encodeURIComponent(cleanCoupon)}`
    : cartUrl;

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* ═══ Heading ═══ */}
      <div style={{ textAlign: 'center', marginBottom: '35px', padding: '50px 20px 20px 20px' }}>
        <h2 style={{ fontSize: '30px', fontWeight: '900', marginBottom: '16px', textTransform: 'uppercase', lineHeight: '1.1' }}>{safeHeading}</h2>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6' }}>{safeBody}</p>

        {cleanCoupon ? (
          <div style={{
            margin: '25px auto 0 auto',
            padding: '16px 24px',
            backgroundColor: '#faf5ff',
            border: '2px dashed #9333ea',
            borderRadius: '12px',
            display: 'inline-block',
            textAlign: 'center',
            maxWidth: '380px'
          }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '800', color: '#7e22ce', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {isEn ? `Special ${couponValue}% Discount Code` : `Cod Cupon -${couponValue}% Reducere`}
            </p>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '900', 
              color: '#581c87', 
              letterSpacing: '2px', 
              fontFamily: 'monospace',
              padding: '6px 18px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #d8b4fe',
              display: 'inline-block'
            }}>
              {cleanCoupon}
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280' }}>
              {isEn ? 'Automatically applied when clicking the button below' : 'Aplicat automat când apeși butonul de mai jos'}
            </p>
          </div>
        ) : null}
        
        <div style={{ marginTop: cleanCoupon ? '22px' : '30px' }}>
          <a href={directCartUrl} style={{
              display: 'inline-block',
              backgroundColor: '#e32f8c',
              color: '#000',
              padding: '16px 36px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '900',
              fontSize: '14px',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}>{safeCta}</a>
        </div>
      </div>

      {/* ═══ Cart Contents ═══ */}
      <div style={{ padding: '0 20px', marginBottom: '50px', backgroundColor: '#f9f9f9', borderRadius: '12px', paddingTop: '30px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', marginBottom: '25px', letterSpacing: '1px', textTransform: 'uppercase', textAlign: 'center' }}>{staticTranslations.cart_contents}</h3>
        {safeItems.map((item, index) => (
          <div key={index} style={{ 
            display: 'table', 
            width: '100%',
            marginBottom: '20px',
            borderBottom: '1px solid #eee',
            paddingBottom: '20px'
          }}>
            <div style={{ display: 'table-cell', width: '90px', verticalAlign: 'middle', position: 'relative' }}>
              <img 
                src={(() => {
                  let img = item.image;
                  if (!img || img === 'undefined' || img === 'null') {
                    return `${baseUrl}/images/products/x10_elbow_wraps_purple_1.webp`;
                  }
                  if (typeof img === 'string' && img.startsWith('http')) return img;
                  if (typeof img === 'string' && img.startsWith('/')) return `${baseUrl}${img}`;
                  return `${supabaseBase}${img}`;
                })()} 
                alt={item.name} 
                style={{ width: '90px', borderRadius: '8px', display: 'block' }} 
              />
            </div>
            <div style={{ display: 'table-cell', paddingLeft: '20px', verticalAlign: 'middle' }}>
              <p style={{ fontWeight: '900', margin: '0', fontSize: '16px' }}>
                {typeof item.name === 'object' && item.name !== null 
                  ? (item.name[locale] || item.name['ro'] || item.name['en'] || 'Produs') 
                  : item.name}
              </p>
              <p style={{ color: '#666', fontSize: '13px', margin: '4px 0' }}>x{item.quantity}</p>
              <p style={{ fontWeight: '800', margin: '0', fontSize: '15px', color: '#e32f8c' }}>{item.price} {currency}</p>
            </div>
          </div>
        ))}
        <div style={{ textAlign: 'right', padding: '20px 0' }}>
            <span style={{ fontWeight: '900', fontSize: '14px', color: '#666', textTransform: 'uppercase', marginRight: '10px' }}>{staticTranslations.total}</span>
            <span style={{ fontWeight: '900', fontSize: '24px', color: '#000' }}>{cartTotal} {currency}</span>
        </div>
      </div>
      
      {/* Unsubscribe link specific for marketing */}
      {userEmail && (
        <div style={{ textAlign: 'center', marginTop: '30px', marginBottom: '10px' }}>
          <a href={`${baseUrl}/${locale}/unsubscribe?email=${encodeURIComponent(userEmail)}`} style={{ color: '#999', fontSize: '11px', textDecoration: 'underline' }}>
            {staticTranslations.unsubscribe}
          </a>
        </div>
      )}
    </BaseEmailLayout>
  );
};
