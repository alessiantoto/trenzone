import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SHIPPING_COUNTRIES, COUNTRY_SHIPPING_INFO } from '@/lib/schema';
import { getCdnUrl } from '@/lib/utils/cdn';
import { getProductPrice, getServerExchangeRates } from '@/utils/pricing';

const BASE_URL = 'https://www.trenzone.fit';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseLocalizableString(val: any, locale: string): string {
  if (!val) return '';
  if (typeof val === 'object') {
    return val[locale] || val.ro || val.en || '';
  }
  if (typeof val === 'string') {
    if (val.trim().startsWith('{')) {
      // First try standard JSON parse
      try {
        const parsed = JSON.parse(val);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed[locale] || parsed.ro || parsed.en || val;
        }
      } catch (e) {
        // Fallback for badly formatted python-like dicts using single quotes
        try {
          // Only replace single quotes that are used as string delimiters, to avoid breaking apostrophes
          // Simple heuristic: replace ' with " only if it looks like a key/value boundary.
          // For safety, let's just do a basic replace but wrap it in try-catch.
          // If it fails, we just return the raw string.
          const validJsonStr = val.replace(/'/g, '"');
          const parsed = JSON.parse(validJsonStr);
          if (typeof parsed === 'object' && parsed !== null) {
            return parsed[locale] || parsed.ro || parsed.en || val;
          }
        } catch (err) {
          // Do nothing, let it return raw string
        }
      }
    }
  }
  return String(val);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || searchParams.get('lang') || 'ro';
    const currency = (searchParams.get('currency') || (locale === 'ro' ? 'RON' : 'EUR')).toUpperCase();
    const targetCountry = searchParams.get('country')?.toUpperCase() || (locale === 'ro' ? 'RO' : null);

    // Fetch active products
    const { data: products, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching products for Google Merchant feed:', error);
      return new NextResponse('Error generating feed', { status: 500 });
    }

    const itemsXml: string[] = [];

    for (const product of products || []) {
      const isRo = locale === 'ro';

      // Localized name & title
      const rawName = parseLocalizableString(product.name, locale);
      const rawMetaTitle = product.meta_title ? parseLocalizableString(product.meta_title, locale) : rawName;

      // Google Shopping title optimization (max 150 chars, rich attributes)
      const title = rawMetaTitle || `${rawName} | TrenZone®`;

      // Description (clean text, no html)
      const rawDesc = product.long_description
        ? parseLocalizableString(product.long_description, locale)
        : parseLocalizableString(product.description, locale);

      const cleanDesc = (rawDesc || title)
        .replace(/<[^>]*>?/gm, '')
        .replace(/\s+/g, ' ')
        .trim();

      const productUrl = `${BASE_URL}/${locale}/product/${product.slug}`;

      // Images: Google requires absolute https URLs, min 100x100 (preferably 800x800+)
      const mainImageRaw = product.main_image || product.image || (Array.isArray(product.images) ? product.images[0] : null);
      const mainImageUrl = mainImageRaw
        ? getCdnUrl(mainImageRaw.startsWith('http') ? mainImageRaw : `${BASE_URL}${mainImageRaw}`)
        : `${BASE_URL}/images/products/x10_elbow_wraps_purple_1.webp`;

      const additionalImages = (Array.isArray(product.images) ? product.images : [])
        .filter((img: string) => img && img !== mainImageRaw)
        .map((img: string) => getCdnUrl(img.startsWith('http') ? img : `${BASE_URL}${img}`))
        .slice(0, 10);

      // Price calculation
      let priceVal = 149.00;
      if (product.price_numeric) {
        priceVal = Number(product.price_numeric);
      } else if (typeof product.price === 'object' && product.price !== null) {
        priceVal = Number(product.price[currency]) || Number(product.price.RON) || 149;
      } else if (product.price) {
        priceVal = Number(product.price);
      }

      // If non-RON currency requested and price is in RON, convert using storefront pricing helper
      await getServerExchangeRates();
      const convertedPrice = currency === 'RON' ? priceVal : getProductPrice(priceVal, currency);
      let formattedPrice = `${convertedPrice.toFixed(2)} ${currency}`;

      const sku = product.sku || `TZ-${product.slug?.toUpperCase() || 'PRODUCT'}`;
      // Removed invalid dummy GTIN. If they don't have a real barcode, it's better to omit it and set identifier_exists=no
      const gtin = product.gtin || null;
      const brand = product.brand || 'TrenZone';

      // Google Product Category & Product Type
      const googleCategory = 'Sporting Goods > Exercise & Fitness > Weight Lifting';
      const productType = isRo
        ? 'Echipamente Sportive > Powerlifting > Benzi de Cot'
        : 'Sporting Goods > Powerlifting > Elbow Wraps';

      // Shipping tags for all 25 countries (or filtered if targetCountry specified)
      const shippingXml: string[] = [];
      const countriesToInclude = targetCountry ? [targetCountry] : SHIPPING_COUNTRIES;

      for (const cCode of countriesToInclude) {
        const info = COUNTRY_SHIPPING_INFO[cCode] || { minDays: 5, maxDays: 10, currency: 'EUR', carrier: 'Packeta' };
        // Ensure shipping currency strictly matches the product currency
        const shipCost = cCode === 'RO' 
          ? (currency === 'EUR' ? '3.00 EUR' : '14.99 RON') 
          : (currency === 'RON' ? '89.00 RON' : '18.00 EUR');
          
        const shipService = cCode === 'RO' ? 'Sameday Curier / Easybox (1-3 zile)' : `${info.carrier} Express (3-5 zile)`;

        shippingXml.push(`
        <g:shipping>
          <g:country>${cCode}</g:country>
          <g:service>${escapeXml(shipService)}</g:service>
          <g:price>${shipCost}</g:price>
        </g:shipping>`);
      }

      // Construct item
      itemsXml.push(`
    <item>
      <g:id>${escapeXml(sku)}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${cleanDesc}]]></g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(mainImageUrl)}</g:image_link>
      ${additionalImages.map((img: string) => `<g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`).join('\n      ')}
      <g:availability>${(product.stock_quantity ?? 1) > 0 ? 'in_stock' : 'out_of_stock'}</g:availability>
      <g:price>${formattedPrice}</g:price>
      <g:brand><![CDATA[${brand}]]></g:brand>
      <g:condition>new</g:condition>
      ${gtin ? `<g:gtin>${gtin}</g:gtin>\n      <g:identifier_exists>yes</g:identifier_exists>` : '<g:identifier_exists>no</g:identifier_exists>'}
      <g:mpn>${escapeXml(sku)}</g:mpn>
      <g:google_product_category><![CDATA[${googleCategory}]]></g:google_product_category>
      <g:product_type><![CDATA[${productType}]]></g:product_type>
      ${shippingXml.join('')}
    </item>`);
    }

    const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>TrenZone® Google Merchant Feed</title>
    <link>${BASE_URL}</link>
    <language>${locale}</language>
    <description>Official Google Merchant Center Product Feed for TrenZone - Heavy-Duty Elbow Wraps &amp; Powerlifting Equipment</description>
    ${itemsXml.join('\n')}
  </channel>
</rss>`;

    return new NextResponse(feedXml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        'CDN-Cache-Control': 'public, s-maxage=3600'
      }
    });
  } catch (error: any) {
    console.error('Unhandled error in Google Merchant feed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
