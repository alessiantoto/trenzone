/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';

interface BroadcastEmailTemplateProps {
  title: string;
  message: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  locale?: 'ro' | 'en';
  userEmail?: string;
}

/**
 * ELITE BROADCAST EMAIL TEMPLATE
 * Design versatile prentru campanii de marketing TrenZone.
 */
export const BroadcastEmailTemplate: React.FC<Readonly<BroadcastEmailTemplateProps>> = ({
  title,
  message,
  ctaText,
  ctaLink,
  imageUrl,
  locale = 'ro',
  userEmail
}) => {
  const baseUrl = "https://www.trenzone.fit";
  
  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      {/* 📸 HEADER IMAGE (OPȚIONAL) */}
      {imageUrl && (
        <div style={{ padding: '0', textAlign: 'center', backgroundColor: '#111' }}>
          <img 
            src={imageUrl} 
            alt={title} 
            style={{ 
              width: '100%', 
              maxWidth: '600px', 
              height: 'auto', 
              display: 'block',
              margin: '0 auto' 
            }} 
          />
        </div>
      )}

      {/* 📝 CONTENT AREA */}
      <div style={{ padding: '50px 30px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '900', 
          color: '#000', 
          textTransform: 'uppercase', 
          marginBottom: '30px',
          lineHeight: '1.1',
          letterSpacing: '-1px'
        }}>
          {title}
        </h1>
        
        <div style={{ 
          fontSize: '17px', 
          color: '#333', 
          lineHeight: '1.6', 
          textAlign: 'center',
          maxWidth: '480px',
          margin: '0 auto',
          fontWeight: '500'
        }} dangerouslySetInnerHTML={{ __html: message.replace(/\n/g, '<br />') }} />

        {/* 🚀 CALL TO ACTION */}
        {ctaText && ctaLink && (
          <div style={{ marginTop: '50px', marginBottom: '20px' }}>
            <a href={ctaLink} style={{
              display: 'inline-block',
              backgroundColor: '#000',
              color: '#fff',
              padding: '18px 50px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '900',
              fontSize: '13px',
              letterSpacing: '1px',
              textTransform: 'uppercase',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)'
            }}>
              {ctaText}
            </a>
          </div>
        )}
      </div>
    </BaseEmailLayout>
  );
};
