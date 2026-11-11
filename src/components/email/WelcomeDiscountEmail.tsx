import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';

interface WelcomeDiscountEmailProps {
  customerName: string;
  locale: 'ro' | 'en';
  templateData?: {
    subject_ro: string;
    subject_en: string;
    heading_ro: string;
    heading_en: string;
    body_ro: string;
    body_en: string;
    cta_ro: string;
    cta_en: string;
  };
  userEmail?: string;
  baseUrl?: string;
  couponCode?: string;
  couponValue?: number;
}

export const WelcomeDiscountEmail: React.FC<Readonly<WelcomeDiscountEmailProps>> = ({
  customerName,
  locale = 'ro',
  templateData,
  userEmail,
  baseUrl = "https://www.trenzone.fit",
  couponCode = "TRENZONE10",
  couponValue = 10
}) => {
  const isEn = locale === 'en';
  const welcomeText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;
  
  // Fallbacks in case templateData is missing
  const safeWelcome = welcomeText || (isEn ? "Welcome to TrenZone!" : "Bun venit la TrenZone!");
  const safeBody = bodyText || (isEn
    ? "We are thrilled to have you in our community. At TrenZone, we don't just engineer heavy-duty strength gear; we back every lift, PR, and training session built without compromises."
    : "Ne bucurăm că te-ai alăturat comunității noastre. La TrenZone, nu creăm doar echipamente de forță construite pentru sarcini extreme, ci susținem fiecare PR și fiecare antrenament dus la limită.");
  const safeCta = ctaText || (isEn ? "VIEW THE STORE" : "VEZI MAGAZINUL");
  const discountTitle = isEn ? "YOUR DISCOUNT CODE" : "CODUL TĂU DE REDUCERE";
  const discountDesc = isEn ? `Use the code below on your first order to get ${couponValue}% off any item in our store.` : `Folosește codul de mai jos la prima ta comandă pentru o reducere de ${couponValue}% la orice articol.`;

  
  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* ═══ Content ═══ */}
      <div style={{ padding: '50px 30px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#000', textTransform: 'uppercase', marginBottom: '20px' }}>
          {safeWelcome}
        </h2>
        <p style={{ fontSize: '16px', color: '#444', lineHeight: '1.6', marginBottom: '40px', maxWidth: '480px', margin: '0 auto 40px' }}>
          {safeBody}
        </p>

        {/* ═══ Discount Box ═══ */}
        <div style={{ 
          backgroundColor: '#f9f9f9', 
          border: '2px dashed #ddd', 
          borderRadius: '16px', 
          padding: '40px 30px',
          marginBottom: '50px'
        }}>
          <p style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '2px', color: '#888', marginBottom: '15px' }}>
            {discountTitle}
          </p>
          <h3 style={{ fontSize: '48px', fontWeight: '900', color: '#000', margin: '0 0 15px 0', letterSpacing: '4px' }}>
            {couponCode}
          </h3>
          <p style={{ fontSize: '14px', color: '#666', margin: '0 0 30px 0' }}>
            {discountDesc}
          </p>
          
          <a href={`${baseUrl}/${locale}/shop`} style={{
            display: 'inline-block',
            backgroundColor: '#000',
            color: '#fff',
            padding: '18px 50px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '900',
            fontSize: '13px',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            {safeCta}
          </a>
        </div>
      </div>
    </BaseEmailLayout>
  );
};
