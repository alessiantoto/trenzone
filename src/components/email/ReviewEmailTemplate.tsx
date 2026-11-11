/* eslint-disable @next/next/no-img-element */
import * as React from 'react';
import { BaseEmailLayout } from './BaseEmailLayout';
import { resolveItemImage } from '@/lib/product-images';

interface ReviewEmailTemplateProps {
  orderId: string;
  customerName: string;
  items: any[];
  locale: 'ro' | 'en';
  templateData?: {
    heading_ro?: string;
    heading_en?: string;
    body_ro?: string;
    body_en?: string;
    cta_ro?: string;
    cta_en?: string;
  };
  baseUrl?: string;
  userEmail?: string;
}

export const ReviewEmailTemplate: React.FC<Readonly<ReviewEmailTemplateProps>> = ({
  orderId,
  customerName,
  items,
  locale = 'ro',
  templateData,
  baseUrl = "https://www.trenzone.fit",
  userEmail
}) => {
  const isEn = locale === 'en';
  
  const headingText = isEn ? templateData?.heading_en : templateData?.heading_ro;
  const bodyText = isEn ? templateData?.body_en : templateData?.body_ro;
  const ctaText = isEn ? templateData?.cta_en : templateData?.cta_ro;

  const defaultHeading = isEn ? "HOW WAS YOUR EXPERIENCE?" : "CUM A FOST EXPERIENȚA TA?";
  const safeHeading = (headingText || defaultHeading).replace('{{name}}', customerName.split(' ')[0] || '');

  const defaultBody = isEn
    ? "We would love to hear how your new gear feels under heavy training. Your review helps us and the community, and it only takes a few seconds."
    : "Ne-ar ajuta enorm dacă ne-ai lăsa câteva cuvinte despre cum se simte noul tău echipament la antrenament. Părerea ta contează pentru întreaga comunitate de forță.";
  const safeBody = (bodyText || defaultBody).replace('{{name}}', customerName.split(' ')[0] || '');

  // Scale texts (Dislike / Love it)
  const dislikeText = ctaText?.includes('|') ? ctaText.split('|')[0]?.trim() : (isEn ? "Dislike it" : "Nu-mi place");
  const loveText = ctaText?.includes('|') ? ctaText.split('|')[1]?.trim() : (isEn ? "Love it!" : "Îl ador!");
  const actionButtonText = ctaText && !ctaText.includes('|') ? ctaText : (isEn ? "LEAVE A REVIEW" : "LASĂ O RECENZIE");

  const safeItems = Array.isArray(items) && items.length > 0 
    ? items 
    : [{ name: 'X10 Elbow Wraps — Purple', slug: 'x10-elbow-wraps', image: '/images/products/x10_elbow_wraps_purple_1.webp' }];

  const isMultiProduct = safeItems.length > 1;

  // Helper to resolve product slug safely
  const resolveSlug = (item: any) => {
    if (item.slug && typeof item.slug === 'string' && item.slug.trim()) return item.slug;
    const nameLower = String(item.name || '').toLowerCase();
    if (nameLower.includes('wrist') || nameLower.includes('încheietur') || nameLower.includes('incheietur')) return 'x10-wrist-wraps';
    if (nameLower.includes('centur') || nameLower.includes('belt')) return 'centura-powerlifting';
    if (nameLower.includes('tricou') || nameLower.includes('t-shirt') || nameLower.includes('tshirt')) return 'tricou-trenzone';
    if (nameLower.includes('x10')) return 'x10-elbow-wraps';
    if (nameLower.includes('x5')) return 'x5-elbow-wraps';
    return 'x10-elbow-wraps';
  };

  // Helper to resolve reliable image URL
  const resolveImage = (item: any) => {
    let img = item.selectedVariant?.image || item.image;
    if (!img || img === 'undefined') {
      img = resolveItemImage(item);
    }
    if (typeof img === 'string') {
      if (img.startsWith('http')) return img;
      if (baseUrl) return `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;
      return img;
    }
    return '/images/products/x10_elbow_wraps_purple_1.webp';
  };

  return (
    <BaseEmailLayout locale={locale} baseUrl={baseUrl} userEmail={userEmail}>
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px' }}>
        
        {/* Heading */}
        <h2 style={{ 
          fontSize: '28px', 
          fontWeight: '900', 
          color: '#111827', 
          textTransform: 'uppercase', 
          marginBottom: '16px', 
          textAlign: 'center',
          letterSpacing: '-0.5px',
          lineHeight: '1.2'
        }}>
          {safeHeading}
        </h2>

        {/* Personalized greeting & body */}
        <p style={{ fontSize: '16px', color: '#111827', fontWeight: 'bold', marginBottom: '10px', textAlign: 'center' }}>
          {isEn ? "Hello" : "Salut"} {customerName},
        </p>
        <p style={{ fontSize: '15px', color: '#4b5563', lineHeight: '1.6', marginBottom: isMultiProduct ? '35px' : '40px', textAlign: 'center', maxWidth: '520px', margin: '0 auto 35px' }}>
          {safeBody}
        </p>

        {/* Multi-product subheader */}
        {isMultiProduct && (
          <div style={{ 
            backgroundColor: '#f8fafc', 
            borderRadius: '12px', 
            padding: '12px 18px', 
            marginBottom: '30px', 
            textAlign: 'center',
            border: '1px solid #e2e8f0'
          }}>
            <p style={{ margin: '0', fontSize: '13px', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {isEn 
                ? `You ordered ${safeItems.length} products — Rate each below:` 
                : `Ai comandat ${safeItems.length} produse — Evaluează-le mai jos:`}
            </p>
          </div>
        )}

        {/* Product Review Cards */}
        {safeItems.map((item, index) => {
          const itemSlug = resolveSlug(item);
          const itemImage = resolveImage(item);
          const itemName = typeof item.name === 'object' && item.name !== null
            ? (item.name[locale] || item.name['ro'] || item.name['en'] || 'Produs')
            : (item.name || 'Produs');

          return (
            <div 
              key={index} 
              style={{ 
                textAlign: 'center', 
                marginBottom: isMultiProduct ? '35px' : '20px',
                padding: isMultiProduct ? '24px 18px' : '0 10px',
                backgroundColor: isMultiProduct ? '#fafafa' : '#ffffff',
                borderRadius: isMultiProduct ? '16px' : '0',
                border: isMultiProduct ? '1px solid #f1f5f9' : 'none'
              }}
            >
              {/* Product Badge for Multi-product orders */}
              {isMultiProduct && (
                <div style={{ marginBottom: '15px' }}>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    color: '#e32f8c',
                    backgroundColor: 'rgba(227, 47, 140, 0.08)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'inline-block'
                  }}>
                    {isEn ? `Product ${index + 1} of ${safeItems.length}` : `Produsul ${index + 1} din ${safeItems.length}`}
                  </span>
                </div>
              )}

              {/* Product Image */}
              <div style={{ position: 'relative', width: isMultiProduct ? '210px' : '250px', margin: '0 auto 16px', display: 'inline-block' }}>
                <img 
                  src={itemImage} 
                  alt={itemName} 
                  style={{ 
                    width: isMultiProduct ? '210px' : '250px', 
                    height: 'auto', 
                    borderRadius: '12px', 
                    display: 'block',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
                  }} 
                />
                {baseUrl === "" && (
                  <div style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    color: '#ffffff',
                    padding: '3px 7px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    letterSpacing: '1px',
                    zIndex: 10
                  }}>
                    EXEMPLU
                  </div>
                )}
              </div>
              
              {/* Product Title */}
              <h3 style={{ fontSize: '17px', fontWeight: '800', margin: '0 0 6px 0', color: '#0f172a' }}>
                {itemName}
              </h3>
              
              {/* Star Rating Links */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <a 
                    key={star} 
                    href={`${baseUrl}/${locale}/product/${itemSlug}?review=open&rating=${star}`}
                    title={`${star} ${star === 1 ? 'stea' : 'stele'}`}
                    style={{ 
                      textDecoration: 'none', 
                      display: 'inline-block', 
                      margin: '0 5px', 
                      fontSize: isMultiProduct ? '40px' : '44px', 
                      color: '#fbbf24', 
                      lineHeight: '1',
                      transition: 'transform 0.15s ease'
                    }}
                  >
                    ★
                  </a>
                ))}
              </div>
              
              {/* Dislike / Love it scale */}
              <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '280px', margin: '12px auto 0', fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>
                <span>{dislikeText}</span>
                <span>{loveText}</span>
              </div>

              {/* Direct Button for each product */}
              <div style={{ marginTop: '20px' }}>
                <a 
                  href={`${baseUrl}/${locale}/product/${itemSlug}?review=open`}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    padding: isMultiProduct ? '10px 24px' : '14px 32px',
                    borderRadius: '10px',
                    textDecoration: 'none',
                    fontWeight: '800',
                    fontSize: isMultiProduct ? '12px' : '13px',
                    letterSpacing: '0.8px',
                    textTransform: 'uppercase'
                  }}
                >
                  {isMultiProduct 
                    ? (isEn ? `Review ${itemName.split('—')[0].trim()}` : `Evaluează ${itemName.split('—')[0].trim()}`)
                    : actionButtonText}
                </a>
              </div>
              
              {!isMultiProduct && (
                <div style={{ maxWidth: '300px', margin: '30px auto 0', borderBottom: '1px solid #eaeaea' }} />
              )}
            </div>
          );
        })}
        
      </div>
    </BaseEmailLayout>
  );
};

