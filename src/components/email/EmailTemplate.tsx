/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { getProductPrice } from '@/utils/pricing';
import { getMediaCdnBase } from '@/lib/utils/cdn';
import { getSiteUrl } from '@/lib/site-config';

interface EmailTemplateProps {
  orderId: string;
  customerName: string;
  totalAmount: string;
  items: any[];
  locale: 'ro' | 'en';
  trackingNumber?: string;
  baseUrl?: string;
  currency?: string;
  templateData?: {
    heading_ro: string;
    heading_en: string;
    body_ro: string;
    body_en: string;
    cta_ro: string;
    cta_en: string;
  };
  userEmail?: string;
  upsellProducts?: any[];
  programUpsellProducts?: any[];
  subtotal?: number | string;
  discount?: number | string;
  shipping?: number | string;
  priorityProcessing?: boolean;
  priorityCost?: number | string;
  giftPackaging?: boolean;
  giftCost?: number | string;
  giftMessage?: string | null;
  cardDiscount?: number | string;
  isPreorder?: boolean;
  exchangeRates?: Record<string, number>;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
  orderId = '',
  customerName = '',
  totalAmount = '0.00',
  items = [],
  locale = 'ro',
  trackingNumber,
  baseUrl = getSiteUrl(),
  currency = "RON",
  templateData,
  userEmail,
  upsellProducts = [],
  programUpsellProducts = [],
  subtotal,
  discount,
  cardDiscount,
  shipping,
  priorityProcessing,
  priorityCost,
  giftPackaging,
  giftCost,
  giftMessage,
  isPreorder = false,
  exchangeRates
}) => {
  const isEn = locale === 'en';
  
  const headingText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;

  const defaultWelcome = isPreorder
    ? (isEn ? "Pre-order Confirmed!" : "Precomandă Confirmată!")
    : (isEn ? "Hi, {{name}}!" : "Salut, {{name}}!");

  const defaultBody = isPreorder
    ? (isEn
        ? "Your spot in the new production batch is 100% secured! Thank you for your support. You will receive automatic email updates as soon as your pre-order enters fulfillment dispatch."
        : "Locul tău din noul lot de producție este 100% garantat și rezervat! Îți mulțumim pentru încredere și răbdare. Vei primi actualizări automate pe email imediat ce comanda ta intră în etapa de expediere.")
    : (isEn
        ? "Thank you for your purchase and for being part of the TrenZone family! We cannot wait for you to enjoy your new gear."
        : "Ești acum oficial parte din familia TrenZone. Ne bucurăm că ai ales performanța și abia așteptăm să te bucuri de noile tale produse!");

  const defaultCta = isPreorder
    ? (isEn ? "VIEW PRE-ORDER" : "DETALII PRECOMANDĂ")
    : (isEn ? "VIEW TRACKING" : "URMĂREȘTE LIVRAREA");

  const firstCustomerName = (customerName || '').trim().split(/\s+/)[0] || '';
  const safeOrderId = String(orderId || '');
  const applyPlaceholders = (text: string) =>
    text.replaceAll('{{name}}', firstCustomerName).replaceAll('{{id}}', safeOrderId);

  const safeWelcome = applyPlaceholders(headingText || defaultWelcome);
  const safeBody = applyPlaceholders(bodyText || defaultBody);
  const safeCta = ctaText || defaultCta;

  const resolveLocalizedName = (rawName: any): string => {
    if (typeof rawName === 'string') return rawName;
    if (rawName && typeof rawName === 'object') {
      const candidate = rawName[locale] || rawName.en || rawName.ro || Object.values(rawName).find((v) => typeof v === 'string' && v.trim());
      if (typeof candidate === 'string') return candidate;
    }
    return isEn ? 'Product' : 'Produs';
  };

  const isDigitalOnlyOrder =
    Array.isArray(items) &&
    items.length > 0 &&
    items.every((it: any) =>
      Boolean(
        it?.is_digital ||
        it?.specs_summary?.is_digital ||
        /food[- ]?plan|training[- ]?program|bench[- ]?program|pachet[- ]?complet/i.test(String(it?.slug || it?.name || ''))
      )
    );

  const staticTranslations = isEn ? {
    thanks: isPreorder ? "Thank you for your pre-order!" : "Thank you for your purchase!",
    status: isDigitalOnlyOrder
      ? "Order Status: INSTANT DIGITAL DELIVERY"
      : isPreorder
        ? "Pre-order Status: SPOT RESERVED (IN PRODUCTION)"
        : "Order Status: PREPARING FOR SHIPMENT",
    shipped: isPreorder ? "PRE-ORDER ITEMS" : "ORDER DETAILS",
    upsell: "YOU MIGHT ALSO LIKE...",
    total: "TOTAL",
    buy_now: "BUY NOW",
    what_next_with_awb: "Our team is already preparing your package! Below you can find your tracking information. Click the button to view the real-time progress as your order moves toward you.",
    what_next_no_awb: isDigitalOnlyOrder
      ? "Your order includes digital programs only — no physical shipping is required. You will receive a dedicated email with your PDF download links shortly."
      : isPreorder
        ? "Your place in the upcoming production batch is 100% secured! As soon as the batch is ready, your order will be dispatched with top priority and you will receive your AWB tracking link."
        : "Our team is already preparing your package! You will receive another email with your tracking information as soon as your order is handed over to the courier.",
    pending_awb: isDigitalOnlyOrder ? "DIGITAL DELIVERY" : isPreorder ? "BATCH RESERVED" : "AWB PENDING"
  } : {
    thanks: isPreorder ? "Mulțumim pentru precomandă!" : "Mulțumim pentru comandă!",
    status: isDigitalOnlyOrder
      ? "Status Comandă: LIVRARE DIGITALĂ INSTANT"
      : isPreorder
        ? "Status Comandă: PRECOMANDĂ REZERVATĂ (ÎN LOTUL DE PRODUCȚIE)"
        : "Status Comandă: ÎN CURS DE PREGĂTIRE",
    shipped: isPreorder ? "PRODUSE ÎN PRECOMANDĂ" : "DETALII COMANDĂ",
    upsell: "S-AR PUTEA SĂ-ȚI PLACĂ ȘI...",
    total: "TOTAL",
    buy_now: "CUMPĂRĂ ACUM",
    what_next_with_awb: "Echipa noastră pregătește deja coletul tău! Mai jos găsești numărul de urmărire (AWB). Apasă pe buton pentru a vedea progresul în timp real, pe măsură ce comanda înaintează spre tine.",
    what_next_no_awb: isDigitalOnlyOrder
      ? "Comanda ta conține exclusiv programe digitale — nu necesită livrare fizică prin curier. Vei primi un email separat cu accesul la fișierele PDF."
      : isPreorder
        ? "Locul tău din noul lot este garantat 100%! Imediat ce producția este finalizată, comanda va fi ambalată cu prioritate maximă și vei primi numărul AWB de urmărire pe email."
        : "Echipa noastră pregătește deja coletul tău! Vei primi un email separat cu datele de urmărire (AWB) în momentul în care comanda este predată curierului.",
    pending_awb: isDigitalOnlyOrder ? "LIVRARE DIGITALĂ" : isPreorder ? "LOT REZERVAT (PRECOMANDĂ)" : "URMEAZĂ SĂ FIE PREDAT"
  };

  const supabaseBase = getMediaCdnBase();

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* Hero Image Removed at User Request */}

      {/* ═══ Heading ═══ */}
      <div style={{ textAlign: 'center', marginBottom: '35px', padding: '50px 20px 20px 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', lineHeight: '1.1' }}>{staticTranslations.thanks}</h2>
        <p style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{safeWelcome}</p>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6' }}>{safeBody}</p>
      </div>

      {/* ═══ Tracking Status Box ═══ */}
      <div style={{ 
        backgroundColor: '#111', 
        borderRadius: '12px', 
        padding: '40px 30px', 
        margin: '0 20px 40px 20px',
        textAlign: 'center',
        color: '#fff'
      }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: '900', 
          letterSpacing: '2px', 
          color: '#888',
          marginBottom: '15px',
          textTransform: 'uppercase'
        }}>{staticTranslations.status}</div>
        
        <div style={{ 
          height: '3px', 
          backgroundColor: '#333', 
          borderRadius: '2px', 
          width: '100%', 
          marginBottom: '25px',
          position: 'relative'
        }}>
          <div style={{ 
            position: 'absolute', 
            top: '0', 
            left: '0', 
            width: trackingNumber ? '100%' : '50%', 
            height: '100%', 
            backgroundColor: trackingNumber ? '#e32f8c' : '#fff', 
            borderRadius: '2px' 
          }}></div>
        </div>

        <p style={{ fontSize: '14px', color: '#ccc', margin: '0 0 25px 0', lineHeight: '1.5' }}>
          {trackingNumber ? staticTranslations.what_next_with_awb : staticTranslations.what_next_no_awb}
        </p>
        
        {trackingNumber ? (
          <a href={
            (/^Z\d+/i.test(trackingNumber.trim()) || /^\d{10}$/.test(trackingNumber.trim()))
              ? `https://tracking.packeta.com/${locale}/?id=${encodeURIComponent(trackingNumber.trim())}`
              : `https://sameday.ro/awb-tracking/?awb=${encodeURIComponent(trackingNumber.trim())}`
          } style={{
            display: 'inline-block',
            backgroundColor: '#ff6b00',
            color: '#fff',
            padding: '16px 30px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '900',
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>{safeCta}</a>
        ) : (
          <span style={{
            display: 'inline-block',
            backgroundColor: '#333',
            color: '#888',
            padding: '16px 30px',
            borderRadius: '8px',
            fontWeight: '900',
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>{staticTranslations.pending_awb}</span>
        )}
      </div>

      {/* ═══ What's Been Shipped ═══ */}
      <div style={{ padding: '0 20px', marginBottom: '50px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: '900', marginBottom: '25px', letterSpacing: '1px', textTransform: 'uppercase' }}>{staticTranslations.shipped}</h3>
        {items.map((item, index) => (
          <div key={index} style={{ 
            display: 'table', 
            width: '100%',
            marginBottom: '20px',
            borderBottom: '1px solid #f2f2f2',
            paddingBottom: '20px'
          }}>
            <div style={{ display: 'table-cell', width: '90px', verticalAlign: 'middle', position: 'relative' }}>
              <div style={{ 
                position: 'relative', 
                display: 'inline-block',
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <img 
                  src={item.image?.startsWith('http') ? item.image : `${baseUrl}${item.image?.startsWith('/') ? '' : '/'}${item.image || ''}`} 
                  alt={typeof item.name === 'string' ? item.name : (isEn ? 'Product' : 'Produs')} 
                  style={{ width: '90px', height: '90px', objectFit: 'contain', borderRadius: '8px', display: 'block' }} 
                />
                {baseUrl === "" && (
                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '8px', padding: '2px 4px', borderRadius: '2px', fontWeight: 'bold' }}>
                    {isEn ? 'SAMPLE' : 'EXEMPLU'}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'table-cell', paddingLeft: '20px', verticalAlign: 'middle' }}>
              <p style={{ fontWeight: '900', margin: '0', fontSize: '16px' }}>
                {resolveLocalizedName(item.name)}
              </p>
              <p style={{ color: '#666', fontSize: '13px', margin: '4px 0' }}>x{Number(item.quantity) || 1}</p>
              <p style={{ fontWeight: '800', margin: '0', fontSize: '15px' }}>{Number(item.price || 0).toFixed(2)} {currency}</p>
            </div>
          </div>
        ))}
        <table style={{ width: '100%', borderTop: '2px solid #000', marginTop: '30px', paddingTop: '20px' }}>
          <tbody>
            {/* 1. Subtotal */}
            {subtotal !== undefined && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>Subtotal</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>{Number(subtotal).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* 2. Livrare */}
            {shipping !== undefined && Number(shipping) > 0 && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>{isEn ? 'Shipping' : 'Livrare'}</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>{Number(shipping).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* 3. Reducere Cupon / Bundle */}
            {discount !== undefined && Number(discount) > 0 && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#e32f8c' }}>{isEn ? 'Discount' : 'Reducere'}</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#e32f8c' }}>-{Number(discount).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* 4. Procesare Prioritară */}
            {priorityProcessing && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>{isEn ? 'Priority Processing' : 'Procesare Prioritară'}</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>+{(priorityCost !== undefined ? Number(priorityCost) : getProductPrice(6.90, currency, exchangeRates)).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* 5. Împachetare Cadou */}
            {giftPackaging && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>{isEn ? 'Gift Packaging' : 'Împachetare Cadou'}</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#666' }}>+{(giftCost !== undefined ? Number(giftCost) : getProductPrice(14.90, currency, exchangeRates)).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* Mesaj Cadou */}
            {giftMessage && (
              <tr>
                <td colSpan={2} style={{ paddingBottom: '16px' }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#666' }}>{isEn ? 'Gift Message:' : 'Mesaj Cadou:'}</span><br/>
                  <span style={{ fontSize: '14px', fontStyle: 'italic', color: '#888' }}>"{giftMessage}"</span>
                </td>
              </tr>
            )}
            {/* 6. Reducere Card */}
            {cardDiscount !== undefined && Number(cardDiscount) > 0 && (
              <tr>
                <td style={{ verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#e32f8c' }}>{isEn ? 'Card Payment Discount' : 'Reducere Plată Card'}</span>
                </td>
                <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '8px' }}>
                  <span style={{ fontWeight: '700', fontSize: '16px', color: '#e32f8c' }}>-{Number(cardDiscount).toFixed(2)} {currency}</span>
                </td>
              </tr>
            )}
            {/* 7. Total */}
            <tr>
              <td style={{ verticalAlign: 'bottom', paddingBottom: '0', paddingTop: '10px' }}>
                <span style={{ fontWeight: '900', fontSize: '24px', letterSpacing: '-1.5px', color: '#000', textTransform: 'uppercase' }}>{staticTranslations.total}</span>
              </td>
              <td style={{ textAlign: 'right', verticalAlign: 'bottom', paddingBottom: '0', paddingTop: '10px' }}>
                <span style={{ fontWeight: '900', fontSize: '28px', letterSpacing: '-1.5px', color: '#000' }}>{totalAmount} {currency}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ═══ Upsell Sections (Equipment + Digital Programs separated) ═══ */}
      {[
        {
          heading: isEn ? 'YOU MIGHT ALSO LIKE — GEAR' : 'ECHIPAMENTE RECOMANDATE',
          list: upsellProducts,
        },
        {
          heading: isEn ? 'DIGITAL PROGRAMS (INSTANT PDF)' : 'PROGRAME DIGITALE (PDF INSTANT)',
          list: programUpsellProducts,
        },
      ]
        .filter((group) => group.list && group.list.length > 0)
        .map((group, groupIdx) => (
          <div
            key={groupIdx}
            style={{
              padding: groupIdx === 0 ? '48px 20px 36px' : '28px 20px 52px',
              textAlign: 'center',
              backgroundColor: '#111',
              borderTop: groupIdx > 0 ? '1px solid #222' : undefined,
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '900',
                marginBottom: '28px',
                letterSpacing: '-0.3px',
                color: '#fff',
                textTransform: 'uppercase',
              }}
            >
              {group.heading}
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  {group.list.slice(0, 2).map((prod, idx) => {
                    const productName = resolveLocalizedName(prod.name);
                    const upsellPrice =
                      prod.convertedPrice !== undefined
                        ? Number(prod.convertedPrice)
                        : getProductPrice(prod.price, currency, exchangeRates);
                    return (
                      <td key={idx} style={{ width: '50%', padding: '0 8px', verticalAlign: 'top' }}>
                        <a href={`${baseUrl}/${locale}/product/${prod.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div
                            style={{
                              overflow: 'hidden',
                              borderRadius: '12px',
                              backgroundColor: '#222',
                              marginBottom: '16px',
                              position: 'relative',
                              maxWidth: '200px',
                              margin: '0 auto',
                            }}
                          >
                            <img
                              src={
                                prod.image?.startsWith('http') || prod.image?.startsWith('/')
                                  ? prod.image.startsWith('/')
                                    ? `${baseUrl}${prod.image}`
                                    : prod.image
                                  : `${supabaseBase}${prod.image || ''}`
                              }
                              alt={productName}
                              style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover' }}
                            />
                            {baseUrl === '' && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '6px',
                                  right: '6px',
                                  background: 'rgba(0,0,0,0.7)',
                                  color: '#fff',
                                  fontSize: '9px',
                                  padding: '2px 6px',
                                  borderRadius: '2px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {isEn ? 'SAMPLE' : 'EXEMPLU'}
                              </div>
                            )}
                          </div>
                          <div style={{ height: '42px', overflow: 'hidden', marginBottom: '4px' }}>
                            <p
                              style={{
                                fontWeight: '800',
                                margin: '0',
                                fontSize: '12px',
                                lineHeight: '1.2',
                                color: '#fff',
                              }}
                            >
                              {productName}
                            </p>
                          </div>
                          <p style={{ color: '#fff', fontWeight: '900', fontSize: '13px', marginBottom: '15px' }}>
                            {upsellPrice.toFixed(2)} {currency}
                          </p>
                        </a>
                        <a
                          href={`${baseUrl}/${locale}/product/${prod.slug}`}
                          style={{
                            display: 'block',
                            backgroundColor: '#fff',
                            color: '#000',
                            padding: '12px 0',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '11px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                          }}
                        >
                          {staticTranslations.buy_now}
                        </a>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        ))}
    </BaseEmailLayout>
  );
};
