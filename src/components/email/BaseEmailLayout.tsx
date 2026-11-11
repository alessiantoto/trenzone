/* eslint-disable @next/next/no-img-element */
import * as React from 'react';

interface BaseEmailLayoutProps {
  children: React.ReactNode;
  locale: 'ro' | 'en';
  baseUrl: string;
  userEmail?: string;
  previewText?: string;
}

const translations = {
  ro: {
     support: "Dacă ai întrebări, ne poți contacta oricând la trenzone483@gmail.com",
     location: "ROMÂNIA",
     copyright: "TOATE DREPTURILE REZERVATE",
     unsubscribe: "Dezabonare de la e-mailuri"
  },
  en: {
     support: "If you have any questions, you can contact us anytime at trenzone483@gmail.com",
     location: "ROMANIA",
     copyright: "ALL RIGHTS RESERVED",
     unsubscribe: "Unsubscribe from emails"
  }
};

import { Html, Head, Body, Preview } from '@react-email/components';

export const BaseEmailLayout: React.FC<Readonly<BaseEmailLayoutProps>> = ({ 
  children, 
  locale = 'ro', 
  baseUrl = "https://www.trenzone.fit",
  userEmail,
  previewText
}) => {
  const lang = locale === 'en' ? translations.en : translations.ro;

  return (
    <Html lang={locale}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{`
          :root {
            color-scheme: light dark;
            supported-color-schemes: light dark;
          }
        `}</style>
      </Head>
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{
        backgroundColor: '#f9f9f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        margin: '0',
        padding: '0',
        width: '100%',
        WebkitTextSizeAdjust: '100%',
        msTextSizeAdjust: '100%',
      } as React.CSSProperties}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        backgroundColor: '#ffffff',
      }}>
        
        {/* ═══ Header (Solid Black) ═══ */}
        <div style={{ 
          textAlign: 'center', 
          padding: '40px 0', 
          backgroundColor: '#0a0a0a' 
        }}>
          <a href={baseUrl} style={{ textDecoration: 'none' }}>
            <img 
              src={`${baseUrl}/images/logos/trenzone_logo.png`}
              alt="TrenZone"
              width="65"
              style={{ 
                display: 'block', 
                margin: '0 auto',
                width: '65px',
                height: 'auto',
                border: '0'
              }} 
            />
          </a>
        </div>

        {/* ═══ Main Content ═══ */}
        <div style={{ padding: '0 0', backgroundColor: '#ffffff' }}>
          {children}
        </div>

        {/* ════ Footer (Solid Black) ════ */}
        <div style={{ 
          textAlign: 'center', 
          padding: '70px 40px', 
          backgroundColor: '#0a0a0a',
          color: '#888888',
          borderTop: '1px solid #111'
        }}>
          <p style={{ fontSize: '13px', marginBottom: '35px', lineHeight: '1.6', color: '#999' }}>{lang.support}</p>
          
          <div style={{ margin: '0 auto 30px auto' }}>
            <img 
              src={`${baseUrl}/images/logos/trenzone_logo.png`}
              alt="TrenZone"
              width="60"
              style={{ 
                display: 'block', 
                margin: '0 auto',
                width: '60px',
                height: 'auto',
                border: '0'
              }} 
            />
          </div>
          
          <div style={{ fontSize: '10px', opacity: '0.6', letterSpacing: '1px', textTransform: 'uppercase' }}>
            TRENZONE | {lang.location}
            <br /><br />
            &copy; {new Date().getFullYear()} TRENZONE. {lang.copyright}.
          </div>

          <div style={{ marginTop: '30px' }}>
            <a href={`${baseUrl}/${locale}/dezabonare${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`} style={{ color: '#aaa', textDecoration: 'underline', fontSize: '11px' }}>
              {lang.unsubscribe}
            </a>
          </div>
        </div>
      </div>
      </Body>
    </Html>
  );
};
