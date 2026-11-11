/**
 * 🇷🇴 Integrare Oblio API v2 & Transmitere Automată în ANAF SPV (e-Factura)
 * 
 * Documentație oficială Oblio: https://www.oblio.eu/api/docs/
 * 
 * Pentru a transmite automat facturile în ANAF SPV prin Oblio:
 * 1. Creează cont pe https://www.oblio.eu și configurează datele firmei.
 * 2. Mergi în contul Oblio la: Setări -> e-Factura / SPV -> Conectează certificatul digital ANAF și bifează „Trimite automat facturile în SPV”.
 * 3. Generează o Cheie API din Oblio: Setări -> Date cont -> API -> Adaugă secret API.
 * 4. Adaugă variabilele în .env.local:
 *    - OBLIO_EMAIL=email@tau.ro
 *    - OBLIO_SECRET=cheie_secreta_oblio
 *    - OBLIO_CIF=RO12345678 (CUI-ul firmei tale)
 *    - OBLIO_SERIES_NAME=ODIN (Numele seriei create în Oblio, ex: FAC sau ODIN)
 */

import { getProductPrice } from '@/utils/pricing';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';

interface OblioTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function getCountyFromZip(zip?: string | null): string | null {
  if (!zip || zip.length < 2) return null;
  const prefix = zip.substring(0, 2);
  const map: Record<string, string> = {
    '01': 'Bucuresti', '02': 'Bucuresti', '03': 'Bucuresti', '04': 'Bucuresti', '05': 'Bucuresti', '06': 'Bucuresti',
    '07': 'Ilfov', '08': 'Giurgiu', '10': 'Prahova', '11': 'Arges', '12': 'Buzau', '13': 'Dambovita',
    '14': 'Teleorman', '20': 'Dolj', '21': 'Gorj', '22': 'Mehedinti', '23': 'Olt', '24': 'Valcea',
    '30': 'Timis', '31': 'Arad', '32': 'Caras-Severin', '33': 'Hunedoara', '40': 'Cluj', '41': 'Bihor',
    '42': 'Bistrita-Nasaud', '43': 'Maramures', '44': 'Satu Mare', '45': 'Salaj', '50': 'Brasov', '51': 'Alba',
    '52': 'Covasna', '53': 'Harghita', '54': 'Mures', '55': 'Sibiu', '60': 'Bacau', '61': 'Neamt',
    '62': 'Vrancea', '70': 'Iasi', '71': 'Botosani', '72': 'Suceava', '73': 'Vaslui', '80': 'Galati',
    '81': 'Braila', '82': 'Tulcea', '90': 'Constanta', '91': 'Calarasi', '92': 'Ialomita'
  };
  return map[prefix] || null;
}

/**
 * Obține token-ul Bearer de autentificare pentru Oblio REST API
 * Conform: https://www.oblio.eu/api#authorize
 */
async function getOblioAccessToken(): Promise<string> {
  const email = process.env.OBLIO_EMAIL?.trim();
  const secret = process.env.OBLIO_SECRET?.trim();

  if (!email || !secret) {
    throw new Error(
      'Configurație Oblio incompletă. Adaugă OBLIO_EMAIL și OBLIO_SECRET în variabilele de mediu (.env.local).'
    );
  }

  // Folosim token-ul din cache dacă este încă valid
  const now = Date.now();
  if (cachedToken && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  // Oficial: Content-Type: application/x-www-form-urlencoded la https://www.oblio.eu/api/authorize/token
  const params = new URLSearchParams();
  params.append('client_id', email);
  params.append('client_secret', secret);

  const response = await fetch('https://www.oblio.eu/api/authorize/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: params.toString(),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ [OBLIO AUTH ERROR]:', response.status, errorText);
    throw new Error(`Autentificare Oblio eșuată (${response.status}): ${errorText}`);
  }

  const data: OblioTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (Number(data.expires_in) || 3600) * 1000;

  return cachedToken;
}

export interface OblioIssueInvoiceResult {
  success: boolean;
  seriesName?: string;
  number?: string;
  link?: string;
  einvoiceStatus?: string;
  error?: string;
}

/**
 * Emite o factură fiscală în Oblio pe baza datelor unei comenzi din magazin
 * Conform: https://www.oblio.eu/api#docs_issue
 */
export async function issueOblioInvoice(order: any): Promise<OblioIssueInvoiceResult> {
  const cif = process.env.OBLIO_CIF?.trim();
  const seriesName = process.env.OBLIO_SERIES_NAME?.trim() || 'ODIN';

  if (!cif) {
    throw new Error('Lipsește CUI/CIF-ul firmei. Configurează OBLIO_CIF în variabilele de mediu (.env.local).');
  }

  const token = await getOblioAccessToken();

  // Extrage identificatorul oficial al comenzii (ex: TZ-2026-9003 sau TZ-0003-110926)
  const displayOrderId = getCanonicalOrderNumber(order);

  // Pregătim datele clientului
  const customerName = `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || order.customer || 'Client';
  const customerEmail = order.customer_email || order.customerEmail || '';
  const customerPhone = order.customer_phone || order.customerPhone || '';
  const address = `${order.addr_line1 || ''} ${order.addr_line2 || ''}`.trim() || 'România';
  const city = order.addr_city || 'București';
  
  // SPV Fix: Extract County from Romanian Postal Code (do not fall back to city name for RO SPV!)
  const zipCounty = getCountyFromZip(order.addr_zip);
  const country = order.addr_country || 'România';
  const isRoCountry = ['RO', 'ROMANIA', 'ROMÂNIA'].includes(String(country).trim().toUpperCase());
  const state = order.addr_county || zipCounty || (isRoCountry ? 'București' : (order.addr_city || 'București'));

  // Parsăm produsele comenzii
  let rawItems = order.items || [];
  if (typeof rawItems === 'string') {
    try {
      rawItems = JSON.parse(rawItems);
    } catch {
      rawItems = [];
    }
  }

  const products = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => {
    let name = typeof item.name === 'object'
      ? (item.name?.ro || item.name?.en || 'Produs')
      : (item.name || item.title || 'Produs');

    const variant = item.selectedVariant?.name || item.variant || '';
    if (variant && typeof variant === 'string' && !name.includes(variant)) {
      name = `${name} (${variant})`;
    }

    const qty = Number(item.quantity || item.q || 1);
    const unitPrice = Number(item.price || item.unitPrice || 0);

    return {
      name: name.substring(0, 200),
      code: String(item.id || item.productId || '').substring(0, 50),
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: qty > 0 ? qty : 1,
      price: unitPrice > 0 ? unitPrice : 0,
      vatName: 'Nu este cazul', // Neplătitor de TVA (sau se ia din setările firmei din Oblio)
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Marfa',
      save: 1,
    };
  });

  // Dacă comanda are transport plătit, îl adăugăm ca linie separată
  const shippingCost = Number(order.shipping_cost ?? order.shipping_amount ?? order.carrier_metadata?.shipping_cost ?? 0);
  if (shippingCost > 0) {
    products.push({
      name: 'Servicii de livrare curier',
      code: 'TRANSPORT',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: shippingCost,
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  // Dacă nu avem produse parsate, creăm o linie generică cu totalul comenzii
  if (products.length === 0) {
    products.push({
      name: `Comandă magazin online #${displayOrderId}`,
      code: 'COMANDA',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: Number(order.total_amount || order.total || 0),
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Marfa',
      save: 0,
    });
  }

  // Extra services (Priority Processing & Gift Packaging)
  if (order.priority_processing) {
    products.push({
      name: 'Procesare Prioritară',
      code: 'PRIORITY',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: (order.currency && order.currency !== 'RON') ? getProductPrice(6.90, order.currency) : 6.90,
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  if (order.gift_packaging) {
    products.push({
      name: 'Ambalare Cadou',
      code: 'GIFT_WRAP',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: (order.currency && order.currency !== 'RON') ? getProductPrice(14.90, order.currency) : 14.90,
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  // Handle Discounts
  const commercialDiscount = Number(order.discount_total || 0);
  if (commercialDiscount > 0) {
    products.push({
      name: `Reducere comercială${order.carrier_metadata?.coupon_code ? ` (${order.carrier_metadata.coupon_code})` : ''}`,
      code: 'REDUCERE',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: -Math.abs(commercialDiscount),
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  const cardDiscount = Number(order.carrier_metadata?.card_discount || 0);
  if (cardDiscount > 0) {
    products.push({
      name: 'Reducere plata card',
      code: 'REDUCERE_CARD',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: -Math.abs(cardDiscount),
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  const expectedTotal = Number(order.total_amount || order.total || 0);
  const calculatedTotal = products.reduce((acc, p) => acc + (p.price * p.quantity), 0);
  const diff = Math.round((expectedTotal - calculatedTotal) * 100) / 100;
  if (Math.abs(diff) > 0.01 && expectedTotal > 0) {
    products.push({
      name: diff > 0 ? 'Costuri suplimentare' : 'Discount suplimentar',
      code: 'AJUSTARE',
      measuringUnit: 'buc',
      currency: (order.currency || 'RON').toUpperCase(),
      quantity: 1,
      price: diff,
      vatName: 'Nu este cazul',
      vatPercentage: 0,
      vatIncluded: 1,
      productType: 'Serviciu',
      save: 0,
    });
  }

  // Metodă de încasare document
  const isCod = order.payment_method === 'cod' || order.payment_method === 'ramburs';
  const collectData = isCod
    ? null
    : { type: 'Card', documentNumber: order.payment_intent_id || order.receipt_url?.split('/').slice(-2, -1)[0] || '' };

  const payload: Record<string, any> = {
    cif: cif,
    seriesName: seriesName,
    orderNumber: String(displayOrderId), // Apare pe factura Oblio și în XML e-Factura (BT-13)
    language: 'RO',
    issueDate: order.issueDate || (order.created_at ? order.created_at.split('T')[0] : undefined),
    currency: (order.currency || 'RON').toUpperCase(),
    precision: 2,
    sendEmail: 0, // trimitem noi factura pe email prin sistemul magazinului
    spvExtern: 1, // Activează trimiterea automată în SPV dacă e configurat în Oblio
    client: {
      name: customerName,
      address: address,
      city: city,
      state: state,
      country: country,
      email: customerEmail,
      phone: customerPhone,
      vatPayer: false,
      save: 1,
    },
    ...(collectData ? { collect: collectData } : {}),
    products: products,
    internalNote: `Comandă magazin #${displayOrderId}`,
    mentions: `Comandă online #${displayOrderId}. Modalitate plată: ${isCod ? 'Ramburs la livrare' : 'Card bancar online'}.`,
  };

  // Endpoint oficial Oblio REST API: https://www.oblio.eu/api/docs/invoice
  const response = await fetch('https://www.oblio.eu/api/docs/invoice', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const resData = await response.json();

  if (!response.ok || (resData.status && resData.status >= 400)) {
    console.error('❌ [OBLIO ISSUE ERROR]:', resData);
    return {
      success: false,
      error: resData.statusMessage || resData.error || resData.message || 'Eroare la emiterea facturii în Oblio',
    };
  }

  const invoiceData = resData.data || {};

  return {
    success: true,
    seriesName: invoiceData.seriesName || seriesName,
    number: String(invoiceData.number || ''),
    link: invoiceData.link || '',
    einvoiceStatus: 'Trimis automat către ANAF SPV',
  };
}

/**
 * Verifică conexiunea la contul Oblio descărcând lista companiilor
 * Conform: https://www.oblio.eu/api#nomenclature
 */
export async function testOblioConnection(): Promise<{ success: boolean; companyName?: string; error?: string }> {
  try {
    const token = await getOblioAccessToken();
    const response = await fetch('https://www.oblio.eu/api/nomenclature/companies', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, error: err };
    }

    const data = await response.json();
    const companies = data.data || [];
    const configuredCif = process.env.OBLIO_CIF?.trim().replace(/\s+/g, '').toUpperCase();
    const matched = companies.find((c: any) => c.cif?.replace(/\s+/g, '').toUpperCase() === configuredCif);

    return {
      success: true,
      companyName: matched?.company || companies[0]?.company || 'Companie conectată',
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Verifică dacă cheile Oblio sunt configurate în variabilele de mediu
 */
export function isOblioConfigured(): boolean {
  return Boolean(
    process.env.OBLIO_EMAIL &&
    process.env.OBLIO_SECRET &&
    process.env.OBLIO_CIF
  );
}
