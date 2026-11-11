/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';

interface AwbEmailTemplateProps {
  orderId: string;
  customerName: string;
  trackingNumber: string;
  courier: 'sameday' | 'packeta';
  locale: 'ro' | 'en';
  baseUrl?: string;
  userEmail?: string;
  templateData?: {
    heading_ro: string;
    heading_en: string;
    body_ro: string;
    body_en: string;
    cta_ro: string;
    cta_en: string;
  };
}

export const AwbEmailTemplate: React.FC<Readonly<AwbEmailTemplateProps>> = ({
  orderId,
  customerName,
  trackingNumber,
  courier,
  locale = 'ro',
  baseUrl = "https://www.trenzone.fit",
  userEmail,
  templateData
}) => {
  const isEn = locale === 'en';
  
  const safeWelcome = (isEn ? "Hi, {{name}}!" : "Salut, {{name}}!").replace('{{name}}', customerName.split(' ')[0] || 'Zeule');
  
  const headingText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;

  const safeHeading = headingText || (isEn ? "Your Order is on the Way!" : "Comanda ta este pe drum!");
  const safeBody = bodyText || (isEn ? "Great news! Your order has been handed over to the courier and is now on its way to you." : "Vești bune! Comanda ta a fost predată curierului și se îndreaptă spre tine.");
  const safeCta = ctaText || (isEn ? "TRACK YOUR ORDER" : "URMĂREȘTE LIVRAREA");

  const staticTranslations = isEn ? {
    status: "Order Status: SHIPPED",
    what_next: "Below you can find your tracking information. Click the button to view the real-time progress as your order moves toward you.",
    courier_label: "Courier:"
  } : {
    status: "Status Comanda: EXPEDIATĂ",
    what_next: "Mai jos găsești numărul de urmărire (AWB). Apasă pe buton pentru a vedea progresul în timp real, pe măsură ce comanda înaintează spre tine.",
    courier_label: "Curier:"
  };

  const trackingLink = courier === 'sameday' 
    ? `https://sameday.ro/awb-tracking/?awb=${trackingNumber}` 
    : `https://tracking.packeta.com/ro_RO/?id=${trackingNumber}`;

  const courierName = courier === 'sameday' ? 'Sameday' : 'Packeta';

  const primaryColor = courier === 'sameday' ? '#ED1C24' : '#e32f8c';
  const buttonColor = courier === 'sameday' ? '#ED1C24' : '#ff6b00';

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* ═══ Heading ═══ */}
      <div style={{ textAlign: 'center', marginBottom: '35px', padding: '50px 20px 20px 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', lineHeight: '1.1' }}>{safeHeading}</h2>
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
            width: '100%', 
            height: '100%', 
            backgroundColor: primaryColor, 
            borderRadius: '2px' 
          }}></div>
        </div>

        <p style={{ fontSize: '14px', color: '#ccc', margin: '0 0 15px 0', lineHeight: '1.5' }}>
          {staticTranslations.what_next}
        </p>

        <p style={{ fontSize: '15px', color: '#fff', margin: '0 0 25px 0', fontWeight: 'bold' }}>
          {staticTranslations.courier_label} <span style={{ color: primaryColor }}>{courierName}</span><br />
          AWB: {trackingNumber}
        </p>
        
        <a href={trackingLink} style={{
          display: 'inline-block',
          backgroundColor: buttonColor,
          color: '#fff',
          padding: '16px 30px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '900',
          fontSize: '13px',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>{safeCta}</a>
      </div>
    </BaseEmailLayout>
  );
};
