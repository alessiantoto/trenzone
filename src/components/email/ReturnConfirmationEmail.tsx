/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';

interface ReturnConfirmationEmailProps {
  orderId: string;
  customerName: string;
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

export const ReturnConfirmationEmail: React.FC<Readonly<ReturnConfirmationEmailProps>> = ({
  orderId,
  customerName,
  locale = 'ro',
  baseUrl = "https://www.trenzone.fit",
  userEmail,
  templateData
}) => {
  const isEn = locale === 'en';
  
  const safeWelcome = (isEn ? "Hi, {{name}}!" : "Salut, {{name}}!").replace('{{name}}', customerName.split(' ')[0] || (isEn ? 'Champion' : 'Campionule'));
  
  const headingText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;

  const safeHeading = headingText || (isEn ? "Return Request Submitted" : "Cerere de Retur Înregistrată");
  const safeBody = (bodyText || (isEn 
    ? "Hello! We have received your return request for order {{id}}. Our team is currently reviewing your request and we will contact you shortly via email regarding its status and next steps." 
    : "Salutare! Am înregistrat cererea ta de retur pentru comanda {{id}}. Echipa noastră analizează solicitarea și te vom contacta pe email în cel mai scurt timp cu privire la statusul acesteia și pașii următori.")).replace('{{id}}', orderId);
  const safeCta = ctaText || (isEn ? "View Return Policy" : "Vezi Politica de Retur");

  const policyLink = isEn ? `${baseUrl}/en/politica-de-retur` : `${baseUrl}/ro/politica-de-retur`;

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* ═══ Heading ═══ */}
      <div style={{ textAlign: 'center', marginBottom: '35px', padding: '50px 20px 20px 20px' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '12px', textTransform: 'uppercase', lineHeight: '1.1' }}>{safeHeading}</h2>
        <p style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px' }}>{safeWelcome}</p>
        <p style={{ color: '#666', fontSize: '15px', maxWidth: '450px', margin: '0 auto', lineHeight: '1.6' }}>{safeBody}</p>
      </div>

      {/* ═══ Box ═══ */}
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
        }}>{isEn ? 'Return Details' : 'Detalii Retur'}</div>
        
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
            backgroundColor: '#e32f8c', 
            borderRadius: '2px' 
          }}></div>
        </div>

        <p style={{ fontSize: '15px', color: '#fff', margin: '0 0 25px 0', fontWeight: 'bold' }}>
          {isEn ? 'Order Number:' : 'Număr Comandă:'} <span style={{ color: '#e32f8c' }}>{orderId}</span>
        </p>
        
        <a href={policyLink} style={{
          display: 'inline-block',
          backgroundColor: '#e32f8c',
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
