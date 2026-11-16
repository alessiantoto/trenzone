import { convertFromRon, convertToRon } from "@/utils/pricing";

export interface ShippingService {
  id: string;
  name: string;
  type: 'hd' | 'pudo';
  provider: 'packeta' | 'sameday' | 'tce';
}

export const SHIPPING_WEIGHT_STEPS = [
  0.05, 0.1, 0.2, 0.25, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
] as const;

export const MAX_SHIPPING_WEIGHT_KG = 10;
export const SHIPPING_VAT_BUFFER = 1.25; // +25% peste tarifele nete EUR (fără TVA)

export const ALLOWED_SHIPPING_COUNTRIES = [
  'RO', 'HU', 'BG', 'CZ', 'SK', 'PL', 'DE', 'AT', 'IT', 'FR',
  'GR', 'BE', 'NL', 'HR', 'SI', 'ES', 'ES-BI', 'IC', 'PT', 'GB', 'SE', 'FI',
  'EE', 'LV', 'LT', 'LU',
  // Extra țări TCE Worldwide
  'DK', 'IE', 'IS', 'MT', 'NO', 'CH', 'CY', 'TR', 'UA',
  'US', 'CA', 'MX', 'AR', 'BR', 'CL',
  'IL', 'AE', 'CN', 'HK', 'IN', 'ID', 'JP', 'MY', 'SG', 'KR', 'TW', 'TH',
  'AU', 'NZ', 'ZA',
];

/**
 * Stripe Elements / confirmPayment & Google Places expect standard ISO 3166-1 alpha-2 codes.
 * Maps TCE sub-territories (`ES-BI`, `IC`) cleanly to `ES`.
 */
export function toStripeIsoCountryCode(countryCode?: string | null): string {
  const upper = String(countryCode || 'RO').trim().toUpperCase() || 'RO';
  if (upper === 'ES-BI' || upper === 'IC') return 'ES';
  return upper;
}

export const EXPRESS_ALLOWED_COUNTRIES: string[] = Array.from(
  new Set(ALLOWED_SHIPPING_COUNTRIES.map((c) => toStripeIsoCountryCode(c)))
);

export const EU_CUSTOMS_UNION_COUNTRIES = new Set<string>([
  'RO', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI',
  'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT',
  'NL', 'PL', 'PT', 'ES', 'ES-BI', 'SK', 'SI', 'SE',
]);

/**
 * Returns true if the destination country is part of the EU Customs Union (no import duties/VAT on B2C parcels shipped from Romania).
 */
export function isEuCustomsCountry(countryCode?: string | null): boolean {
  if (!countryCode) return true;
  return EU_CUSTOMS_UNION_COUNTRIES.has(countryCode.trim().toUpperCase());
}

export const COUNTRY_SERVICES: Record<string, { hd: ShippingService[]; pudo: ShippingService[] }> = {
  RO: {
    hd: [
      { id: '7', name: 'Sameday / Curier Standard (1-2 Zile)', type: 'hd', provider: 'sameday' },
    ],
    pudo: [
      { id: '15', name: 'Sameday Easybox', type: 'pudo', provider: 'sameday' },
    ],
  },
  AT: { hd: [{ id: '6830', name: 'Curier Rapid / DPD (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  BE: { hd: [{ id: '4832', name: 'Curier Internațional (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  BG: { hd: [{ id: '4015', name: 'Curier Rapid / Speedy (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  HR: { hd: [{ id: '4634', name: 'Curier Rapid (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CY: { hd: [{ id: 'tce-eur', name: 'TCE Worldwide (5-10 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CZ: { hd: [{ id: '106', name: 'Curier Rapid (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  DK: { hd: [{ id: 'tce-dk', name: 'TCE Worldwide (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  EE: { hd: [{ id: '5060', name: 'Curier Rapid / Omniva (4-6 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  FI: { hd: [{ id: '4830', name: 'Curier Rapid / PostNord (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  FR: { hd: [{ id: '16080', name: 'Curier Rapid (4-6 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  DE: { hd: [{ id: '6373', name: 'Curier Rapid (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  GR: { hd: [{ id: '27954', name: 'Curier Rapid (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  HU: { hd: [{ id: '3828', name: 'Curier Rapid (2-3 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IE: { hd: [{ id: 'tce-ie', name: 'TCE Worldwide (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IS: { hd: [{ id: 'tce-is', name: 'TCE Worldwide (4-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IT: { hd: [{ id: '9103', name: 'Curier Rapid (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  LV: { hd: [{ id: '5063', name: 'Curier Rapid / Omniva (4-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  LT: { hd: [{ id: '18808', name: 'Curier Rapid (4-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  LU: { hd: [{ id: '8125', name: 'Curier Rapid (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  MT: { hd: [{ id: 'tce-mt', name: 'TCE Worldwide (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  NL: { hd: [{ id: '8000', name: 'Curier Rapid / DHL (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  NO: { hd: [{ id: 'tce-no', name: 'TCE Worldwide (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  PL: { hd: [{ id: '4162', name: 'Curier Rapid (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  PT: { hd: [{ id: '4655', name: 'Curier Rapid (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  ES: { hd: [{ id: '4653', name: 'Curier Rapid (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  'ES-BI': { hd: [{ id: 'tce-es-bi', name: 'Curier Rapid / Baleare (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IC: { hd: [{ id: 'tce-ic', name: 'Curier Rapid / Canare (4-5 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  SE: { hd: [{ id: '4827', name: 'Curier Rapid / PostNord (5-7 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CH: { hd: [{ id: 'tce-ch', name: 'TCE Worldwide (4-6 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  SK: { hd: [{ id: '131', name: 'Curier Rapid (3-4 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  SI: { hd: [{ id: '19515', name: 'Curier Rapid (4-6 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  GB: { hd: [{ id: '4856', name: 'Curier Rapid / Royal Mail (5-8 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  TR: { hd: [{ id: 'tce-tr', name: 'TCE Worldwide (7-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  UA: { hd: [{ id: 'tce-ua', name: 'TCE Worldwide (7-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CA: { hd: [{ id: 'tce-ca', name: 'TCE Worldwide (7-10 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  US: { hd: [{ id: 'tce-us', name: 'TCE Worldwide (7-10 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  MX: { hd: [{ id: 'tce-mx', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  AR: { hd: [{ id: 'tce-ar', name: 'TCE Worldwide (8-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  BR: { hd: [{ id: 'tce-br', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CL: { hd: [{ id: 'tce-cl', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IL: { hd: [{ id: 'tce-il', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  AE: { hd: [{ id: 'tce-ae', name: 'TCE Worldwide (10-15 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  CN: { hd: [{ id: 'tce-cn', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  HK: { hd: [{ id: 'tce-hk', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  IN: { hd: [{ id: 'tce-in', name: 'TCE Worldwide (8-11 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  ID: { hd: [{ id: 'tce-id', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  JP: { hd: [{ id: 'tce-jp', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  MY: { hd: [{ id: 'tce-my', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  SG: { hd: [{ id: 'tce-sg', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  KR: { hd: [{ id: 'tce-kr', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  TW: { hd: [{ id: 'tce-tw', name: 'TCE Worldwide (11-16 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  TH: { hd: [{ id: 'tce-th', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  AU: { hd: [{ id: 'tce-au', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  NZ: { hd: [{ id: 'tce-nz', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  ZA: { hd: [{ id: 'tce-za', name: 'TCE Worldwide (10-12 Zile)', type: 'hd', provider: 'tce' }], pudo: [] },
  DEFAULT: { hd: [{ id: 'tce-eur', name: 'TCE Worldwide Express', type: 'hd', provider: 'tce' }], pudo: [] },
};

export interface Rate {
  max: number;
  prices: { RON: number; EUR: number; USD: number; GBP: number; HUF: number; BGN: number; [key: string]: number };
}

export interface CountryRate {
  hd?: { rates: Rate[]; fuel?: number };
  pudo?: { rates: Rate[]; fuel?: number };
}

/**
 * Tarife TCE Worldwide brute (EUR fără TVA) pentru treptele:
 * [50g, 100g, 200g, 250g, 300g, 500g, 1kg, 2kg, 3kg, 4kg, 5kg, 6kg, 7kg, 8kg, 9kg, 10kg]
 */
const TCE_RAW_EUR_BY_COUNTRY: Record<string, readonly number[]> = {
  AT: [5.3, 5.6, 6.4, 6.7, 7.7, 8.6, 12.2, 19.5, 20.6, 21.7, 22.7, 23.8, 24.8, 25.9, 26.9, 28.0],
  BE: [6.4, 6.7, 7.4, 7.6, 7.9, 9.2, 12.3, 18.5, 19.4, 20.4, 21.3, 22.3, 23.2, 24.1, 25.1, 26.0],
  DK: [6.9, 7.1, 7.3, 7.5, 7.6, 8.1, 9.4, 12.0, 23.7, 25.1, 26.6, 33.2, 34.7, 36.1, 37.5, 38.9],
  FI: [7.6, 8.0, 8.7, 9.0, 9.4, 10.8, 14.5, 21.7, 23.7, 25.7, 27.7, 29.7, 31.6, 33.6, 35.6, 37.6],
  FR: [6.2, 6.3, 6.6, 6.8, 7.0, 7.6, 9.2, 12.3, 13.1, 15.1, 17.4, 19.4, 21.3, 23.9, 25.5, 27.0],
  DE: [5.4, 5.6, 6.2, 6.5, 6.7, 7.9, 10.7, 16.3, 17.3, 18.4, 19.4, 20.4, 21.4, 22.4, 23.5, 24.5],
  GR: [5.1, 5.6, 6.5, 7.0, 7.5, 9.6, 14.9, 25.5, 30.8, 32.2, 33.6, 48.2, 49.6, 51.0, 52.4, 53.9],
  IS: [7.5, 8.0, 8.9, 9.4, 9.8, 11.6, 16.2, 26.3, 41.3, 45.4, 49.5, 53.7, 57.8, 61.9, 66.0, 70.1],
  IE: [7.2, 7.5, 8.0, 8.3, 8.6, 9.7, 12.6, 18.3, 20.3, 22.2, 24.2, 26.2, 28.1, 30.1, 32.1, 34.1],
  IT: [7.3, 7.4, 7.7, 7.8, 8.0, 8.8, 10.9, 14.9, 17.2, 19.6, 22.0, 24.4, 26.7, 29.1, 31.5, 33.9],
  LU: [6.1, 6.2, 6.5, 6.7, 6.9, 7.5, 9.2, 12.5, 18.6, 20.0, 21.4, 25.1, 26.5, 28.0, 29.4, 30.8],
  MT: [5.9, 6.3, 7.2, 7.6, 8.0, 9.8, 14.0, 22.6, 26.3, 31.0, 35.7, 40.4, 45.1, 49.8, 54.5, 59.2],
  NL: [4.4, 4.7, 5.2, 5.4, 5.7, 6.7, 9.3, 14.5, 15.6, 16.8, 17.9, 19.1, 20.2, 21.4, 22.5, 23.7],
  NO: [7.2, 7.5, 8.0, 8.3, 8.5, 9.6, 12.3, 17.7, 24.2, 27.7, 31.3, 34.8, 38.3, 41.9, 45.4, 48.9],
  PT: [5.4, 5.9, 6.8, 7.3, 7.7, 9.6, 14.2, 23.5, 26.6, 29.6, 32.7, 35.7, 38.8, 41.8, 44.9, 47.9],
  ES: [5.9, 6.0, 6.3, 6.5, 6.6, 7.5, 10.5, 16.6, 19.8, 23.0, 26.3, 29.5, 32.7, 35.9, 39.1, 42.3],
  SE: [5.1, 5.4, 5.9, 6.3, 6.7, 8.2, 12.0, 19.5, 30.2, 31.6, 33.0, 40.7, 42.1, 43.5, 44.9, 46.3],
  CH: [7.6, 7.8, 8.3, 8.5, 8.7, 9.6, 11.7, 16.0, 19.0, 20.9, 22.9, 24.8, 26.7, 28.7, 30.6, 32.6],
  GB: [5.0, 5.3, 5.9, 6.2, 6.5, 7.8, 11.0, 17.3, 19.5, 21.8, 24.0, 26.3, 28.6, 30.8, 33.1, 35.4],
  BG: [5.7, 6.0, 6.5, 6.8, 8.7, 9.0, 9.7, 11.4, 13.4, 14.9, 16.4, 19.3, 20.9, 22.4, 23.9, 25.4],
  HR: [6.5, 6.9, 7.6, 8.0, 8.4, 9.8, 12.4, 18.6, 19.7, 23.4, 27.0, 30.6, 34.3, 37.9, 41.5, 45.2],
  CZ: [2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 2.9, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5.0, 5.3],
  EE: [5.1, 5.5, 6.2, 6.5, 6.9, 8.3, 11.9, 19.0, 20.4, 21.8, 23.3, 30.9, 32.3, 33.8, 35.2, 36.6],
  HU: [4.8, 5.2, 5.8, 6.2, 6.5, 7.9, 11.2, 18.0, 19.4, 20.8, 22.3, 23.7, 25.2, 26.6, 28.0, 29.5],
  LV: [5.2, 5.6, 6.3, 6.6, 7.0, 8.4, 12.0, 19.1, 19.8, 21.2, 22.6, 30.3, 31.7, 33.1, 34.6, 36.0],
  LT: [5.3, 5.6, 6.2, 6.5, 6.8, 7.9, 10.8, 16.4, 18.8, 20.2, 21.6, 29.3, 30.7, 32.1, 33.5, 34.9],
  PL: [5.4, 5.7, 6.3, 6.6, 6.9, 8.1, 11.0, 16.8, 18.5, 20.3, 22.0, 23.8, 25.5, 27.2, 29.0, 30.7],
  RO: [2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 2.7, 2.9, 3.2, 3.5, 3.8, 4.1, 4.4, 4.7, 5.0, 5.3],
  SK: [4.9, 5.2, 5.9, 6.2, 6.5, 7.8, 11.0, 17.3, 18.6, 19.9, 21.1, 22.4, 23.7, 24.9, 26.2, 27.5],
  SI: [9.3, 9.4, 9.7, 9.9, 10.0, 10.6, 12.1, 19.0, 34.9, 36.3, 37.8, 48.9, 50.3, 51.7, 53.1, 54.6],
  TR: [7.2, 7.6, 8.3, 8.6, 9.0, 10.4, 13.9, 21.0, 25.4, 28.6, 31.8, 35.0, 38.2, 41.4, 44.6, 47.8],
  UA: [4.9, 5.7, 7.2, 8.0, 8.8, 12.0, 19.9, 21.7, 24.2, 26.7, 29.2, 31.7, 34.2, 36.7, 39.2, 41.7],
  CA: [7.8, 8.4, 9.6, 10.2, 10.8, 13.2, 19.6, 33.1, 48.2, 58.4, 68.7, 78.9, 89.2, 99.4, 109.7, 119.9],
  US: [7.7, 8.5, 10.0, 10.7, 11.5, 14.4, 21.9, 37.6, 52.7, 65.5, 78.2, 91.0, 103.7, 116.4, 129.2, 141.9],
  MX: [5.9, 6.3, 7.2, 7.7, 8.1, 9.9, 14.5, 23.5, 32.5, 39.5, 46.4, 53.4, 60.4, 67.3, 74.3, 81.3],
  AR: [7.0, 7.8, 9.4, 10.3, 11.1, 14.4, 22.5, 38.9, 54.7, 67.0, 79.3, 91.7, 104.0, 116.4, 128.7, 141.0],
  BR: [7.1, 7.8, 9.1, 9.8, 10.5, 13.2, 20.0, 33.6, 52.9, 62.5, 72.1, 81.7, 91.3, 100.9, 110.5, 120.2],
  CL: [6.8, 7.6, 9.2, 10.0, 10.8, 14.0, 22.1, 38.1, 58.3, 72.2, 86.0, 99.9, 113.8, 127.7, 141.5, 155.4],
  IL: [6.0, 6.5, 7.6, 8.1, 8.6, 10.7, 16.0, 26.4, 33.6, 38.0, 42.4, 46.8, 51.2, 55.6, 60.0, 64.4],
  AE: [4.9, 5.8, 7.7, 8.6, 9.5, 13.1, 16.7, 22.0, 27.3, 32.6, 37.9, 43.2, 48.5, 53.8, 59.1, 64.4],
  CN: [5.8, 6.2, 7.1, 7.5, 7.9, 9.7, 16.7, 23.8, 30.8, 37.9, 45.0, 52.0, 59.1, 66.1, 73.2, 80.2],
  HK: [5.6, 6.2, 7.4, 8.0, 8.6, 11.0, 16.9, 28.8, 40.4, 44.1, 47.7, 51.3, 54.9, 58.6, 62.2, 65.8],
  IN: [5.2, 6.1, 8.0, 8.9, 9.8, 13.4, 16.5, 20.9, 25.3, 29.7, 34.1, 38.5, 42.9, 47.3, 51.7, 56.1],
  ID: [6.5, 7.7, 9.9, 11.1, 12.2, 16.7, 28.1, 50.7, 56.0, 61.4, 66.7, 72.0, 77.3, 82.7, 88.0, 93.3],
  JP: [5.9, 6.6, 8.0, 8.7, 9.4, 12.2, 19.3, 33.4, 36.6, 39.8, 43.0, 46.2, 49.5, 52.7, 55.9, 59.1],
  MY: [5.2, 6.3, 8.5, 9.6, 10.8, 15.2, 26.4, 48.9, 51.0, 53.2, 55.4, 57.6, 59.7, 61.9, 64.1, 66.3],
  SG: [5.8, 6.3, 7.4, 8.0, 8.5, 10.7, 16.2, 27.2, 30.2, 33.2, 36.1, 39.1, 42.1, 45.1, 48.1, 51.0],
  KR: [7.3, 7.9, 9.1, 9.7, 10.2, 12.6, 18.3, 29.9, 33.0, 36.0, 39.0, 42.0, 45.1, 48.1, 51.1, 54.1],
  TW: [5.9, 6.5, 7.6, 8.2, 8.7, 11.0, 16.6, 27.7, 43.4, 51.3, 59.2, 67.2, 75.1, 83.0, 91.0, 98.9],
  TH: [4.9, 5.7, 7.4, 8.3, 9.2, 12.9, 22.1, 37.5, 39.8, 42.1, 44.4, 46.7, 49.0, 51.2, 53.5, 55.8],
  AU: [8.6, 9.6, 11.6, 12.6, 13.5, 17.5, 27.4, 47.3, 54.3, 61.4, 68.5, 75.5, 82.6, 89.6, 96.7, 103.8],
  NZ: [6.9, 7.9, 9.7, 10.7, 11.7, 15.6, 25.4, 45.0, 53.8, 62.7, 71.5, 80.4, 89.2, 98.1, 106.9, 115.8],
  ZA: [6.2, 6.7, 7.8, 8.4, 8.9, 11.2, 16.7, 27.8, 42.7, 51.7, 60.7, 69.8, 78.8, 87.8, 96.8, 105.9],
  // Zone TCE Worldwide
  EUR: [5.7, 6.6, 8.5, 9.5, 10.4, 14.2, 23.7, 25.8, 28.8, 31.8, 34.7, 37.7, 40.6, 43.6, 46.5, 49.5],
  LAM: [6.9, 7.4, 8.5, 9.1, 9.6, 11.8, 17.2, 28.0, 38.8, 47.1, 55.4, 63.7, 72.1, 80.4, 88.7, 97.0],
  SAM: [7.5, 8.3, 9.8, 10.6, 11.3, 14.4, 22.0, 37.3, 63.2, 74.7, 86.2, 97.7, 109.2, 120.7, 132.2, 143.7],
  MEA: [5.8, 6.9, 9.0, 10.1, 11.2, 15.5, 19.9, 26.2, 32.5, 38.8, 45.1, 51.5, 57.8, 64.1, 70.4, 76.7],
  ASI: [6.3, 7.5, 9.9, 11.1, 12.3, 17.1, 29.3, 39.5, 50.5, 61.4, 72.4, 83.3, 94.3, 105.2, 116.2, 127.2],
  OCE: [10.1, 11.3, 13.7, 14.9, 16.1, 20.8, 32.7, 56.5, 79.1, 99.3, 119.5, 139.7, 159.9, 180.2, 200.4, 220.6],
  AFR: [7.3, 7.9, 9.2, 9.9, 10.6, 13.2, 19.9, 33.1, 51.0, 61.8, 72.6, 83.4, 94.2, 105.0, 115.7, 126.5],
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildRatesFromEurList(rawEurList: readonly number[]): Rate[] {
  return SHIPPING_WEIGHT_STEPS.map((maxWeight, idx) => {
    const rawEur = rawEurList[idx] ?? rawEurList[rawEurList.length - 1];
    const eur = round2(rawEur * SHIPPING_VAT_BUFFER);
    const ron = round2(eur * 5.30);
    return {
      max: maxWeight,
      prices: {
        EUR: eur,
        RON: ron,
        USD: round2(ron / 4.88),
        GBP: round2(ron / 6.20),
        HUF: round2(eur * 405),
        BGN: round2(eur * 1.96),
        PLN: round2(ron / 1.23),
        CHF: round2(ron / 5.60),
      },
    };
  });
}

export const SHIPPING_RATES: Record<string, CountryRate> = (() => {
  const map: Record<string, CountryRate> = {};
  for (const [country, rawList] of Object.entries(TCE_RAW_EUR_BY_COUNTRY)) {
    const built = buildRatesFromEurList(rawList);
    map[country] = {
      hd: { rates: built },
      ...(country === 'RO' ? { pudo: { rates: built } } : {}),
    };
  }
  // Cyprus, Spain sub-territories & default rest-of-Europe fallback
  map.CY = { hd: { rates: buildRatesFromEurList(TCE_RAW_EUR_BY_COUNTRY.EUR) } };
  map['ES-BI'] = { hd: { rates: buildRatesFromEurList(TCE_RAW_EUR_BY_COUNTRY.ES) } };
  map.IC = { hd: { rates: buildRatesFromEurList(TCE_RAW_EUR_BY_COUNTRY.ES) } };
  map.DEFAULT = {
    hd: { rates: buildRatesFromEurList(TCE_RAW_EUR_BY_COUNTRY.EUR) },
    pudo: { rates: buildRatesFromEurList(TCE_RAW_EUR_BY_COUNTRY.EUR) },
  };
  return map;
})();

/**
 * 📏 SHIPPING VALIDATION LIMITS
 */
export interface ParcelMetrics {
  weight: number;
  length: number;
  width: number;
  height: number;
  maxSide: number;
  sumLWH: number;
}

export function isServiceAvailable(service: ShippingService, country: string, metrics: ParcelMetrics): boolean {
  const code = country.toUpperCase();
  const { weight, maxSide, sumLWH, length, width, height } = metrics;

  // Lockers have physical compartment limits; Home Delivery stays available above 10kg (cost is capped at 10kg).
  if (service.type === 'pudo') {
    let maxWeight = 15;
    if (code === 'CY' && service.name.includes('BoxNow')) maxWeight = 7;
    if (code === 'RO' || code === 'DE') maxWeight = 30;
    if (weight > maxWeight) return false;
  }

  const dims = [length, width, height].sort((a, b) => b - a);
  if ((code === 'CY' || code === 'GR') && service.name.includes('BoxNow')) {
    if (dims[0] > 620 || dims[1] > 450 || dims[2] > 360) return false;
    if (sumLWH > 1430) return false;
    return true;
  }
  if (code === 'PL' && service.name.includes('InPost')) {
    if (dims[0] > 640 || dims[1] > 410 || dims[2] > 380) return false;
    if (sumLWH > 1430) return false;
    return true;
  }

  if (service.type === 'pudo') {
    const limitMaxSide = code === 'CZ' || code === 'SK' || code === 'DE' ? 1200 : 700;
    const limitSumLWH = code === 'CZ' || code === 'SK' || code === 'DE' ? 1500 : 1200;
    if (maxSide > limitMaxSide || sumLWH > limitSumLWH) return false;
  }

  return true;
}

export function getShippingServices(
  countryCode: string,
  type: 'hd' | 'pudo',
  options?: { lockersEnabled?: boolean }
): ShippingService[] {
  if (type === 'pudo' && !options?.lockersEnabled) {
    return [];
  }
  const country = COUNTRY_SERVICES[countryCode.toUpperCase()] || COUNTRY_SERVICES.DEFAULT;
  return country[type] || [];
}

export function getLocalizedServiceName(service: ShippingService, locale: string = 'ro', t?: any) {
  const isLocker = service.name.includes('Locker') || service.name.includes('Box') || service.name.includes('Easybox') || service.name.includes('Paczkomaty');
  if (locale === 'en' && /\d+\s*Zile/i.test(service.name)) {
    return service.name
      .replace(/Curier Rapid/gi, 'Express Courier')
      .replace(/Curier Internațional/gi, 'International Courier')
      .replace(/Sameday \/ Curier Standard/gi, 'Standard Courier')
      .replace(/(\d+(?:-\d+)?)\s*Zile/gi, '$1 Days');
  }
  if (service.name.includes('Sameday') || service.name.includes('TCE') || service.name.includes('Curier')) {
    return service.name;
  }

  let suffix = '';
  if (t) {
    if (service.type === 'hd') suffix = t('shipping_home_suffix');
    else if (isLocker) suffix = t('shipping_locker_suffix');
    else suffix = t('shipping_pudo_suffix');
  } else {
    if (service.type === 'hd') suffix = locale === 'ro' ? ' (Acasă)' : ' (Home)';
    else if (isLocker) suffix = locale === 'ro' ? ' (Lockere & Box)' : ' (Lockers & Box)';
    else suffix = locale === 'ro' ? ' (Punct Ridicare)' : ' (Pick-up Point)';
  }

  return `${service.name}${suffix}`;
}

/**
 * 🚢 ELITE SHIPPING CALCULATION (TCE Worldwide · EUR + 25% buffer, plafonat la 10 kg)
 */
export function getShippingCost(
  countryCode: string,
  shippingType: 'hd' | 'pudo',
  totalWeight: number = 1,
  targetCurrency: string = 'RON',
  serviceId?: string
): number {
  const code = (countryCode || 'RO').toUpperCase();
  const safeCurrency = (targetCurrency || 'RON').toUpperCase();

  // Plafonare strictă a greutății facturate la maximum 10 kg
  const rawWeight = Number(totalWeight);
  const cappedWeight = Number.isFinite(rawWeight) && rawWeight > 0
    ? Math.min(rawWeight, MAX_SHIPPING_WEIGHT_KG)
    : 0.5;

  const countryData = SHIPPING_RATES[code] || SHIPPING_RATES['DEFAULT'];
  const config = countryData?.[shippingType] || countryData?.hd || SHIPPING_RATES['DEFAULT']?.[shippingType] || SHIPPING_RATES['DEFAULT']?.hd;

  if (!config?.rates?.length) {
    const fallbackEur = round2(15 * SHIPPING_VAT_BUFFER);
    if (safeCurrency === 'EUR') return fallbackEur;
    const ron = convertToRon(fallbackEur, 'EUR');
    return safeCurrency === 'RON' ? ron : convertFromRon(ron, safeCurrency);
  }

  const bracket = config.rates.find((r) => cappedWeight <= r.max) || config.rates[config.rates.length - 1];
  const eurPrice = bracket.prices.EUR;

  if (safeCurrency === 'EUR') {
    return eurPrice;
  }

  const ronPrice = convertToRon(eurPrice, 'EUR');
  if (safeCurrency === 'RON') {
    return ronPrice;
  }

  return convertFromRon(ronPrice, safeCurrency);
}

export function getShippingConfig(countryCode: string) {
  const hd = getShippingServices(countryCode, 'hd')[0] || COUNTRY_SERVICES.DEFAULT.hd[0];
  const pudo = getShippingServices(countryCode, 'pudo')[0] || COUNTRY_SERVICES.DEFAULT.pudo[0];
  return { hd, pudo };
}

export function getInternationalHdId(countryCode: string) {
  return getShippingServices(countryCode, 'hd')[0]?.id || '106';
}

export function getInternationalHdName(countryCode: string, locale: string = 'ro') {
  const s = getShippingServices(countryCode, 'hd')[0];
  return s ? getLocalizedServiceName(s, locale) : 'TCE Worldwide';
}

export function getInternationalPudoId(countryCode: string) {
  return getShippingServices(countryCode, 'pudo')[0]?.id || 'packeta';
}

export function getInternationalPudoName(countryCode: string, locale: string = 'ro') {
  const s = getShippingServices(countryCode, 'pudo')[0];
  return s ? getLocalizedServiceName(s, locale) : 'TCE Worldwide';
}
