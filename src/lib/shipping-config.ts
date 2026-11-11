import { convertFromRon } from "@/utils/pricing";



export interface ShippingService {
  id: string;
  name: string;
  type: 'hd' | 'pudo';
  provider: 'packeta' | 'sameday';
}

export const ALLOWED_SHIPPING_COUNTRIES = [
  'RO', 'HU', 'BG', 'CZ', 'SK', 'PL', 'DE', 'AT', 'IT', 'FR',
  'GR', 'BE', 'NL', 'HR', 'SI', 'ES', 'PT', 'GB', 'SE', 'FI',
  'EE', 'LV', 'LT', 'LU', 'CY'
];

export const COUNTRY_SERVICES: Record<string, { hd: ShippingService[]; pudo: ShippingService[] }> = {
  RO: {
    hd: [
      { id: '7', name: 'Sameday Standard (1-3 Zile)', type: 'hd', provider: 'sameday' }
    ],
    pudo: [
      { id: '15', name: 'Sameday Easybox', type: 'pudo', provider: 'sameday' }
    ]
  },
  AT: { hd: [ { id: '6830', name: 'DPD', type: 'hd', provider: 'packeta' } ], pudo: [] },
  BE: { hd: [ { id: '4832', name: 'Dutch Post', type: 'hd', provider: 'packeta' }, { id: '7909', name: 'Belgian Post', type: 'hd', provider: 'packeta' } ], pudo: [] },
  BG: { hd: [ { id: '4015', name: 'Speedy', type: 'hd', provider: 'packeta' } ], pudo: [] },
  HR: { hd: [ { id: '4634', name: 'Croatian Post', type: 'hd', provider: 'packeta' } ], pudo: [] },
  CY: { hd: [], pudo: [] },
  CZ: { hd: [ { id: '106', name: 'Packeta Home', type: 'hd', provider: 'packeta' } ], pudo: [] },
  EE: { hd: [ { id: '5060', name: 'Omniva', type: 'hd', provider: 'packeta' } ], pudo: [] },
  FI: { hd: [ { id: '4830', name: 'Post Nord', type: 'hd', provider: 'packeta' } ], pudo: [] },
  FR: { hd: [ { id: '16080', name: 'Colis Privé', type: 'hd', provider: 'packeta' } ], pudo: [] },
  DE: { hd: [ { id: '6373', name: 'Hermes', type: 'hd', provider: 'packeta' } ], pudo: [] },
  GR: { hd: [ { id: '27954', name: 'Elta Courier', type: 'hd', provider: 'packeta' } ], pudo: [] },
  HU: { hd: [ { id: '3828', name: 'Express One', type: 'hd', provider: 'packeta' } ], pudo: [] },
  IT: { hd: [ { id: '9103', name: 'Bartolini', type: 'hd', provider: 'packeta' } ], pudo: [] },
  LV: { hd: [ { id: '5063', name: 'Omniva', type: 'hd', provider: 'packeta' } ], pudo: [] },
  LT: { hd: [ { id: '18808', name: 'Lithuanian Post', type: 'hd', provider: 'packeta' } ], pudo: [] },
  LU: { hd: [ { id: '8125', name: 'Luxembourg Post', type: 'hd', provider: 'packeta' } ], pudo: [] },
  NL: { hd: [ { id: '8000', name: 'DHL', type: 'hd', provider: 'packeta' } ], pudo: [] },
  PL: { hd: [ { id: '4162', name: 'InPost', type: 'hd', provider: 'packeta' } ], pudo: [] },
  PT: { hd: [ { id: '4655', name: 'MRW', type: 'hd', provider: 'packeta' } ], pudo: [] },
  GB: { hd: [ { id: '4856', name: 'Royal Mail 24', type: 'hd', provider: 'packeta' } ], pudo: [] },
  SI: { hd: [ { id: '19515', name: 'Slovenian Post', type: 'hd', provider: 'packeta' } ], pudo: [] },
  ES: { hd: [ { id: '4653', name: 'MRW', type: 'hd', provider: 'packeta' } ], pudo: [] },
  SE: { hd: [ { id: '4827', name: 'Post Nord', type: 'hd', provider: 'packeta' } ], pudo: [] },
  SK: { hd: [ { id: '131', name: 'Packeta Home', type: 'hd', provider: 'packeta' } ], pudo: [] },
  DEFAULT: { hd: [ { id: '106', name: 'Packeta', type: 'hd', provider: 'packeta' } ], pudo: [] }
};

export interface Rate {
  max: number;
  prices: { RON: number; EUR: number; USD: number; GBP: number; HUF: number; BGN: number; [key: string]: number };
}

export interface CountryRate {
  hd?: { rates: Rate[]; fuel?: number };
  pudo?: { rates: Rate[]; fuel?: number };
}

export const SHIPPING_RATES: Record<string, CountryRate> = {
  RO: {
    hd: { 
      rates: [ 
        { max: 30, prices: { RON: 14.99, EUR: 3.00, USD: 3.20, GBP: 2.60, HUF: 1200, BGN: 6.00 } } // Default to standard
      ] 
    },
    pudo: { rates: [ { max: 30, prices: { RON: 9.99, EUR: 2.00, USD: 2.10, GBP: 1.70, HUF: 800, BGN: 4.00 } } ] }
  },
  DEFAULT: {
    hd: { rates: [ { max: 100, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } } ] },
    pudo: { rates: [ { max: 100, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } } ] }
  },
  CZ: {
    hd: { rates: [
      { max: 1, prices: { RON: 40.46, EUR: 8.54, USD: 9.26, GBP: 7.31, HUF: 3334.92, BGN: 16.7, CZK: 206.35 } },
      { max: 2, prices: { RON: 42.84, EUR: 9.04, USD: 9.81, GBP: 7.74, HUF: 3531.09, BGN: 17.68, CZK: 218.48 } },
      { max: 5, prices: { RON: 46.41, EUR: 9.79, USD: 10.62, GBP: 8.38, HUF: 3825.34, BGN: 19.15, CZK: 236.69 } },
      { max: 10, prices: { RON: 52.36, EUR: 11.05, USD: 11.99, GBP: 9.46, HUF: 4315.77, BGN: 21.61, CZK: 267.04 } },
      { max: 15, prices: { RON: 61.88, EUR: 13.06, USD: 14.16, GBP: 11.18, HUF: 5100.46, BGN: 25.53, CZK: 315.59 } },
      { max: 30, prices: { RON: 70.21, EUR: 14.82, USD: 16.07, GBP: 12.68, HUF: 5787.06, BGN: 28.97, CZK: 358.07 } },
    ] },
    pudo: { rates: [
      { max: 5, prices: { RON: 30.37, EUR: 6.41, USD: 6.95, GBP: 5.48, HUF: 2503.15, BGN: 12.53, CZK: 154.89 } },
      { max: 10, prices: { RON: 30.37, EUR: 6.41, USD: 6.95, GBP: 5.48, HUF: 2503.15, BGN: 12.53, CZK: 154.89 } },
      { max: 15, prices: { RON: 51.07, EUR: 10.78, USD: 11.69, GBP: 9.22, HUF: 4209.84, BGN: 21.08, CZK: 260.46 } },
    ] },
  },
  SK: {
    hd: { rates: [
      { max: 1, prices: { RON: 46.93, EUR: 9.91, USD: 10.74, GBP: 8.48, HUF: 3868.5, BGN: 19.37 } },
      { max: 2, prices: { RON: 49.69, EUR: 10.49, USD: 11.38, GBP: 8.97, HUF: 4096.06, BGN: 20.51 } },
      { max: 5, prices: { RON: 52.46, EUR: 11.07, USD: 12.01, GBP: 9.47, HUF: 4323.62, BGN: 21.65 } },
      { max: 10, prices: { RON: 57.98, EUR: 12.24, USD: 13.27, GBP: 10.47, HUF: 4778.74, BGN: 23.92 } },
      { max: 15, prices: { RON: 85.58, EUR: 18.06, USD: 19.59, GBP: 15.46, HUF: 7054.33, BGN: 35.32 } },
      { max: 30, prices: { RON: 95.25, EUR: 20.1, USD: 21.8, GBP: 17.2, HUF: 7850.78, BGN: 39.3 } },
    ] },
    pudo: { rates: [
      { max: 5, prices: { RON: 30.37, EUR: 6.41, USD: 6.95, GBP: 5.48, HUF: 2503.15, BGN: 12.53 } },
      { max: 10, prices: { RON: 30.37, EUR: 6.41, USD: 6.95, GBP: 5.48, HUF: 2503.15, BGN: 12.53 } },
      { max: 15, prices: { RON: 51.07, EUR: 10.78, USD: 11.69, GBP: 9.22, HUF: 4209.84, BGN: 21.08 } },
    ] },
  },
  AT: {
    hd: { rates: [
      { max: 1, prices: { RON: 54.74, EUR: 11.55, USD: 12.53, GBP: 9.89, HUF: 4511.94, BGN: 22.59 } },
      { max: 2, prices: { RON: 55.93, EUR: 11.8, USD: 12.8, GBP: 10.1, HUF: 4610.03, BGN: 23.08 } },
      { max: 5, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 10, prices: { RON: 66.64, EUR: 14.06, USD: 15.25, GBP: 12.04, HUF: 5492.8, BGN: 27.5 } },
      { max: 15, prices: { RON: 94.01, EUR: 19.84, USD: 21.52, GBP: 16.98, HUF: 7748.77, BGN: 38.79 } },
      { max: 30, prices: { RON: 147.56, EUR: 31.14, USD: 33.78, GBP: 26.65, HUF: 12162.63, BGN: 60.89 } },
    ] },
  },
  BE: {
    hd: { rates: [
      { max: 0.5, prices: { RON: 74.34, EUR: 15.71, USD: 17.02, GBP: 13.43, HUF: 6127.1, BGN: 30.68 } },
      { max: 1, prices: { RON: 82.11, EUR: 17.36, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
      { max: 2, prices: { RON: 83.42, EUR: 17.65, USD: 19.09, GBP: 15.06, HUF: 6875.9, BGN: 34.42 } },
      { max: 5, prices: { RON: 87.41, EUR: 18.48, USD: 20.01, GBP: 15.78, HUF: 7204.6, BGN: 36.07 } },
      { max: 10, prices: { RON: 100.56, EUR: 21.25, USD: 23.01, GBP: 18.15, HUF: 8288.7, BGN: 41.5 } },
      { max: 15, prices: { RON: 100.56, EUR: 21.25, USD: 23.01, GBP: 18.15, HUF: 8288.7, BGN: 41.5 } },
      { max: 20, prices: { RON: 179.31, EUR: 37.91, USD: 41.05, GBP: 32.38, HUF: 14780.25, BGN: 73.99 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 80.81, EUR: 17.08, USD: 18.5, GBP: 14.6, HUF: 6659.8, BGN: 33.34 } },
      { max: 2, prices: { RON: 87.35, EUR: 18.47, USD: 19.99, GBP: 15.77, HUF: 7199.68, BGN: 36.05 } },
      { max: 5, prices: { RON: 93.91, EUR: 19.85, USD: 21.49, GBP: 16.96, HUF: 7740.75, BGN: 38.75 } },
      { max: 10, prices: { RON: 107.03, EUR: 22.62, USD: 24.51, GBP: 19.33, HUF: 8821.58, BGN: 44.17 } },
      { max: 15, prices: { RON: 121.15, EUR: 25.61, USD: 27.73, GBP: 21.87, HUF: 9985.34, BGN: 49.99 } },
      { max: 30, prices: { RON: 134.25, EUR: 28.38, USD: 30.73, GBP: 24.23, HUF: 11065.34, BGN: 55.4 } },
    ] },
  },
  BG: {
    hd: { rates: [
      { max: 1, prices: { RON: 39.27, EUR: 8.29, USD: 8.99, GBP: 7.09, HUF: 3236.83, BGN: 16.2 } },
      { max: 2, prices: { RON: 42.84, EUR: 9.04, USD: 9.81, GBP: 7.74, HUF: 3531.09, BGN: 17.68 } },
      { max: 5, prices: { RON: 57.12, EUR: 12.06, USD: 13.07, GBP: 10.32, HUF: 4708.12, BGN: 23.57 } },
      { max: 10, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } },
      { max: 15, prices: { RON: 94.01, EUR: 19.84, USD: 21.52, GBP: 16.98, HUF: 7748.77, BGN: 38.79 } },
      { max: 20, prices: { RON: 99.96, EUR: 21.1, USD: 22.88, GBP: 18.05, HUF: 8239.2, BGN: 41.25 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 33.32, EUR: 7.03, USD: 7.63, GBP: 6.02, HUF: 2746.4, BGN: 13.75 } },
      { max: 2, prices: { RON: 34.51, EUR: 7.28, USD: 7.9, GBP: 6.23, HUF: 2844.49, BGN: 14.24 } },
      { max: 5, prices: { RON: 39.27, EUR: 8.29, USD: 8.99, GBP: 7.09, HUF: 3236.83, BGN: 16.2 } },
      { max: 10, prices: { RON: 45.22, EUR: 9.54, USD: 10.35, GBP: 8.17, HUF: 3727.26, BGN: 18.66 } },
      { max: 15, prices: { RON: 53.55, EUR: 11.3, USD: 12.26, GBP: 9.67, HUF: 4413.86, BGN: 22.1 } },
      { max: 20, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
    ] },
  },
  CY: {
    pudo: { rates: [
      { max: 1, prices: { RON: 45.22, EUR: 9.54, USD: 10.35, GBP: 8.17, HUF: 3727.26, BGN: 18.66 } },
      { max: 2, prices: { RON: 45.22, EUR: 9.54, USD: 10.35, GBP: 8.17, HUF: 3727.26, BGN: 18.66 } },
      { max: 5, prices: { RON: 46.95, EUR: 9.91, USD: 10.75, GBP: 8.48, HUF: 3869.48, BGN: 19.37 } },
      { max: 7, prices: { RON: 49.98, EUR: 10.55, USD: 11.44, GBP: 9.03, HUF: 4119.6, BGN: 20.62 } },
    ] },
  },
  HR: {
    hd: { rates: [
      { max: 1, prices: { RON: 42.84, EUR: 9.04, USD: 9.81, GBP: 7.74, HUF: 3531.09, BGN: 17.68 } },
      { max: 2, prices: { RON: 46.41, EUR: 9.79, USD: 10.62, GBP: 8.38, HUF: 3825.34, BGN: 19.15 } },
      { max: 5, prices: { RON: 47.6, EUR: 10.05, USD: 10.9, GBP: 8.6, HUF: 3923.43, BGN: 19.64 } },
      { max: 10, prices: { RON: 51.17, EUR: 10.8, USD: 11.71, GBP: 9.24, HUF: 4217.69, BGN: 21.12 } },
      { max: 15, prices: { RON: 70.21, EUR: 14.82, USD: 16.07, GBP: 12.68, HUF: 5787.06, BGN: 28.97 } },
      { max: 30, prices: { RON: 99.96, EUR: 21.1, USD: 22.88, GBP: 18.05, HUF: 8239.2, BGN: 41.25 } },
      { max: 50, prices: { RON: 647.36, EUR: 136.63, USD: 148.18, GBP: 116.91, HUF: 53358.65, BGN: 267.13 } },
    ] },
  },
  EE: {
    hd: { rates: [
      { max: 1, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
      { max: 2, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } },
      { max: 5, prices: { RON: 67.83, EUR: 14.32, USD: 15.53, GBP: 12.25, HUF: 5590.89, BGN: 27.99 } },
      { max: 10, prices: { RON: 72.59, EUR: 15.32, USD: 16.62, GBP: 13.11, HUF: 5983.23, BGN: 29.95 } },
      { max: 15, prices: { RON: 92.82, EUR: 19.59, USD: 21.25, GBP: 16.76, HUF: 7650.69, BGN: 38.3 } },
      { max: 30, prices: { RON: 109.48, EUR: 23.11, USD: 25.06, GBP: 19.77, HUF: 9023.89, BGN: 45.18 } },
    ] },
  },
  FI: {
    hd: { rates: [
      { max: 1, prices: { RON: 160.65, EUR: 33.91, USD: 36.77, GBP: 29.01, HUF: 13241.58, BGN: 66.29 } },
      { max: 2, prices: { RON: 163.03, EUR: 34.41, USD: 37.32, GBP: 29.44, HUF: 13437.75, BGN: 67.27 } },
      { max: 5, prices: { RON: 166.6, EUR: 35.16, USD: 38.13, GBP: 30.09, HUF: 13732.01, BGN: 68.75 } },
      { max: 10, prices: { RON: 173.74, EUR: 36.67, USD: 39.77, GBP: 31.38, HUF: 14320.52, BGN: 71.69 } },
      { max: 15, prices: { RON: 189.21, EUR: 39.93, USD: 43.31, GBP: 34.17, HUF: 15595.63, BGN: 78.08 } },
      { max: 30, prices: { RON: 195.16, EUR: 41.19, USD: 44.67, GBP: 35.25, HUF: 16086.06, BGN: 80.53 } },
      { max: 100, prices: { RON: 784.21, EUR: 165.51, USD: 179.51, GBP: 141.63, HUF: 64638.51, BGN: 323.6 } },
    ] },
  },
  FR: {
    hd: { rates: [
      { max: 0.5, prices: { RON: 63.07, EUR: 13.31, USD: 14.44, GBP: 11.39, HUF: 5198.54, BGN: 26.03 } },
      { max: 1, prices: { RON: 63.07, EUR: 13.31, USD: 14.44, GBP: 11.39, HUF: 5198.54, BGN: 26.03 } },
      { max: 2, prices: { RON: 67.83, EUR: 14.32, USD: 15.53, GBP: 12.25, HUF: 5590.89, BGN: 27.99 } },
      { max: 5, prices: { RON: 75.57, EUR: 15.95, USD: 17.3, GBP: 13.65, HUF: 6228.45, BGN: 31.18 } },
      { max: 10, prices: { RON: 88.06, EUR: 18.59, USD: 20.16, GBP: 15.9, HUF: 7258.35, BGN: 36.34 } },
      { max: 15, prices: { RON: 104.72, EUR: 22.1, USD: 23.97, GBP: 18.91, HUF: 8631.55, BGN: 43.21 } },
      { max: 30, prices: { RON: 127.33, EUR: 26.87, USD: 29.15, GBP: 23, HUF: 10495.18, BGN: 52.54 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 51.17, EUR: 10.8, USD: 11.71, GBP: 9.24, HUF: 4217.69, BGN: 21.12 } },
      { max: 2, prices: { RON: 52.36, EUR: 11.05, USD: 11.99, GBP: 9.46, HUF: 4315.77, BGN: 21.61 } },
      { max: 5, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 10, prices: { RON: 72.59, EUR: 15.32, USD: 16.62, GBP: 13.11, HUF: 5983.23, BGN: 29.95 } },
      { max: 15, prices: { RON: 111.86, EUR: 23.61, USD: 25.6, GBP: 20.2, HUF: 9220.06, BGN: 46.16 } },
      { max: 30, prices: { RON: 129.71, EUR: 27.38, USD: 29.69, GBP: 23.43, HUF: 10691.35, BGN: 53.52 } },
    ] },
  },
  DE: {
    hd: { rates: [
      { max: 1, prices: { RON: 49.98, EUR: 10.55, USD: 11.44, GBP: 9.03, HUF: 4119.6, BGN: 20.62 } },
      { max: 2, prices: { RON: 53.55, EUR: 11.3, USD: 12.26, GBP: 9.67, HUF: 4413.86, BGN: 22.1 } },
      { max: 5, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 10, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } },
      { max: 15, prices: { RON: 94.01, EUR: 19.84, USD: 21.52, GBP: 16.98, HUF: 7748.77, BGN: 38.79 } },
      { max: 30, prices: { RON: 164.22, EUR: 34.66, USD: 37.59, GBP: 29.66, HUF: 13535.83, BGN: 67.77 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 39.98, EUR: 8.45, USD: 9.17, GBP: 7.22, HUF: 3295.35, BGN: 16.5 } },
      { max: 2, prices: { RON: 42.84, EUR: 9.05, USD: 9.82, GBP: 7.74, HUF: 3531.09, BGN: 17.68 } },
      { max: 5, prices: { RON: 46.65, EUR: 9.85, USD: 10.69, GBP: 8.43, HUF: 3845.12, BGN: 19.25 } },
      { max: 10, prices: { RON: 51.41, EUR: 10.85, USD: 11.77, GBP: 9.29, HUF: 4237.38, BGN: 21.21 } },
      { max: 15, prices: { RON: 75.21, EUR: 15.89, USD: 17.24, GBP: 13.58, HUF: 6199.23, BGN: 31.03 } },
      { max: 30, prices: { RON: 131.38, EUR: 27.73, USD: 30.08, GBP: 23.73, HUF: 10829.02, BGN: 54.21 } },
    ] },
  },
  GR: {
    hd: { rates: [
      { max: 1, prices: { RON: 37.49, EUR: 7.91, USD: 8.58, GBP: 6.77, HUF: 3089.7, BGN: 15.47 } },
      { max: 2, prices: { RON: 38.67, EUR: 8.16, USD: 8.85, GBP: 6.98, HUF: 3187.79, BGN: 15.96 } },
      { max: 5, prices: { RON: 41.65, EUR: 8.79, USD: 9.53, GBP: 7.52, HUF: 3433, BGN: 17.19 } },
      { max: 6, prices: { RON: 52.36, EUR: 11.05, USD: 11.99, GBP: 9.46, HUF: 4315.77, BGN: 21.61 } },
      { max: 7, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 8, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } },
      { max: 10, prices: { RON: 66.64, EUR: 14.06, USD: 15.25, GBP: 12.04, HUF: 5492.8, BGN: 27.5 } },
      { max: 15, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
      { max: 20, prices: { RON: 105.91, EUR: 22.35, USD: 24.24, GBP: 19.13, HUF: 8729.63, BGN: 43.7 } },
      { max: 25, prices: { RON: 141.61, EUR: 29.89, USD: 32.41, GBP: 25.57, HUF: 11672.2, BGN: 58.44 } },
      { max: 30, prices: { RON: 165.41, EUR: 34.91, USD: 37.86, GBP: 29.87, HUF: 13633.92, BGN: 68.26 } },
    ] },
    pudo: { rates: [
      { max: 5, prices: { RON: 32.13, EUR: 6.78, USD: 7.35, GBP: 5.8, HUF: 2648.32, BGN: 13.26 } },
      { max: 10, prices: { RON: 32.13, EUR: 6.78, USD: 7.35, GBP: 5.8, HUF: 2648.32, BGN: 13.26 } },
      { max: 15, prices: { RON: 42.84, EUR: 9.04, USD: 9.81, GBP: 7.74, HUF: 3531.09, BGN: 17.68 } },
    ] },
  },
  IT: {
    hd: { rates: [
      { max: 1, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 2, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
      { max: 5, prices: { RON: 70.21, EUR: 14.82, USD: 16.07, GBP: 12.68, HUF: 5787.06, BGN: 28.97 } },
      { max: 10, prices: { RON: 88.06, EUR: 18.59, USD: 20.16, GBP: 15.9, HUF: 7258.35, BGN: 36.34 } },
      { max: 15, prices: { RON: 120.19, EUR: 25.37, USD: 27.51, GBP: 21.71, HUF: 9906.66, BGN: 49.6 } },
      { max: 30, prices: { RON: 147.56, EUR: 31.14, USD: 33.78, GBP: 26.65, HUF: 12162.63, BGN: 60.89 } },
      { max: 50, prices: { RON: 248.71, EUR: 52.49, USD: 56.93, GBP: 44.92, HUF: 20499.92, BGN: 102.63 } },
      { max: 100, prices: { RON: 427.21, EUR: 90.16, USD: 97.79, GBP: 77.15, HUF: 35212.78, BGN: 176.29 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 2, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
      { max: 5, prices: { RON: 70.21, EUR: 14.82, USD: 16.07, GBP: 12.68, HUF: 5787.06, BGN: 28.97 } },
      { max: 10, prices: { RON: 88.06, EUR: 18.59, USD: 20.16, GBP: 15.9, HUF: 7258.35, BGN: 36.34 } },
      { max: 15, prices: { RON: 120.19, EUR: 25.37, USD: 27.51, GBP: 21.71, HUF: 9906.66, BGN: 49.6 } },
      { max: 30, prices: { RON: 147.56, EUR: 31.14, USD: 33.78, GBP: 26.65, HUF: 12162.63, BGN: 60.89 } },
      { max: 50, prices: { RON: 248.71, EUR: 52.49, USD: 56.93, GBP: 44.92, HUF: 20499.92, BGN: 102.63 } },
      { max: 100, prices: { RON: 427.21, EUR: 90.16, USD: 97.79, GBP: 77.15, HUF: 35212.78, BGN: 176.29 } },
    ] },
  },
  LV: {
    hd: { rates: [
      { max: 1, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
      { max: 2, prices: { RON: 64.26, EUR: 13.56, USD: 14.71, GBP: 11.61, HUF: 5296.63, BGN: 26.52 } },
      { max: 5, prices: { RON: 66.64, EUR: 14.06, USD: 15.25, GBP: 12.04, HUF: 5492.8, BGN: 27.5 } },
      { max: 10, prices: { RON: 72.59, EUR: 15.32, USD: 16.62, GBP: 13.11, HUF: 5983.23, BGN: 29.95 } },
      { max: 15, prices: { RON: 99.96, EUR: 21.1, USD: 22.88, GBP: 18.05, HUF: 8239.2, BGN: 41.25 } },
      { max: 30, prices: { RON: 123.76, EUR: 26.12, USD: 28.33, GBP: 22.35, HUF: 10200.92, BGN: 51.07 } },
    ] },
  },
  LT: {
    hd: { rates: [
      { max: 2, prices: { RON: 47.6, EUR: 10.05, USD: 10.9, GBP: 8.6, HUF: 3923.43, BGN: 19.64 } },
      { max: 5, prices: { RON: 49.98, EUR: 10.55, USD: 11.44, GBP: 9.03, HUF: 4119.6, BGN: 20.62 } },
      { max: 10, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 15, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
      { max: 30, prices: { RON: 105.91, EUR: 22.35, USD: 24.24, GBP: 19.13, HUF: 8729.63, BGN: 43.7 } },
    ] },
  },
  LU: {
    hd: { rates: [
      { max: 1, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
      { max: 2, prices: { RON: 86.87, EUR: 18.33, USD: 19.88, GBP: 15.69, HUF: 7160.26, BGN: 35.85 } },
      { max: 5, prices: { RON: 111.86, EUR: 23.61, USD: 25.6, GBP: 20.2, HUF: 9220.06, BGN: 46.16 } },
      { max: 10, prices: { RON: 135.66, EUR: 28.63, USD: 31.05, GBP: 24.5, HUF: 11181.78, BGN: 55.98 } },
      { max: 15, prices: { RON: 177.31, EUR: 37.42, USD: 40.59, GBP: 32.02, HUF: 14614.78, BGN: 73.17 } },
      { max: 30, prices: { RON: 272.51, EUR: 57.51, USD: 62.38, GBP: 49.22, HUF: 22461.64, BGN: 112.45 } },
    ] },
  },
  NL: {
    hd: { rates: [
      { max: 1, prices: { RON: 76.16, EUR: 16.07, USD: 17.43, GBP: 13.75, HUF: 6277.49, BGN: 31.43 } },
      { max: 2, prices: { RON: 77.35, EUR: 16.32, USD: 17.71, GBP: 13.97, HUF: 6375.57, BGN: 31.92 } },
      { max: 5, prices: { RON: 83.3, EUR: 17.58, USD: 19.07, GBP: 15.04, HUF: 6866, BGN: 34.37 } },
      { max: 10, prices: { RON: 85.68, EUR: 18.08, USD: 19.61, GBP: 15.47, HUF: 7062.17, BGN: 35.36 } },
      { max: 15, prices: { RON: 99.96, EUR: 21.1, USD: 22.88, GBP: 18.05, HUF: 8239.2, BGN: 41.25 } },
      { max: 30, prices: { RON: 111.86, EUR: 23.61, USD: 25.6, GBP: 20.2, HUF: 9220.06, BGN: 46.16 } },
    ] },
  },
  PL: {
    hd: { rates: [
      { max: 1, prices: { RON: 44.03, EUR: 9.29, USD: 10.08, GBP: 7.95, HUF: 3629.17, BGN: 18.17 } },
      { max: 2, prices: { RON: 46.41, EUR: 9.79, USD: 10.62, GBP: 8.38, HUF: 3825.34, BGN: 19.15 } },
      { max: 5, prices: { RON: 49.98, EUR: 10.55, USD: 11.44, GBP: 9.03, HUF: 4119.6, BGN: 20.62 } },
      { max: 10, prices: { RON: 61.88, EUR: 13.06, USD: 14.16, GBP: 11.18, HUF: 5100.46, BGN: 25.53 } },
      { max: 15, prices: { RON: 70.21, EUR: 14.82, USD: 16.07, GBP: 12.68, HUF: 5787.06, BGN: 28.97 } },
      { max: 30, prices: { RON: 88.06, EUR: 18.59, USD: 20.16, GBP: 15.9, HUF: 7258.35, BGN: 36.34 } },
      { max: 50, prices: { RON: 153.51, EUR: 32.4, USD: 35.14, GBP: 27.72, HUF: 12653.06, BGN: 63.35 } },
    ] },
    pudo: { rates: [
      { max: 5, prices: { RON: 38.08, EUR: 8.04, USD: 8.72, GBP: 6.88, HUF: 3138.74, BGN: 15.71 } },
      { max: 10, prices: { RON: 41.65, EUR: 8.79, USD: 9.53, GBP: 7.52, HUF: 3433, BGN: 17.19 } },
      { max: 15, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
    ] },
  },
  PT: {
    hd: { rates: [
      { max: 1, prices: { RON: 57.12, EUR: 12.06, USD: 13.07, GBP: 10.32, HUF: 4708.12, BGN: 23.57 } },
      { max: 2, prices: { RON: 58.31, EUR: 12.31, USD: 13.35, GBP: 10.53, HUF: 4806.2, BGN: 24.06 } },
      { max: 5, prices: { RON: 60.69, EUR: 12.81, USD: 13.89, GBP: 10.96, HUF: 5002.37, BGN: 25.04 } },
      { max: 10, prices: { RON: 71.4, EUR: 15.07, USD: 16.34, GBP: 12.89, HUF: 5885.15, BGN: 29.46 } },
      { max: 15, prices: { RON: 88.06, EUR: 18.59, USD: 20.16, GBP: 15.9, HUF: 7258.35, BGN: 36.34 } },
      { max: 30, prices: { RON: 94.01, EUR: 19.84, USD: 21.52, GBP: 16.98, HUF: 7748.77, BGN: 38.79 } },
    ] },
  },
  GB: {
    hd: { rates: [
      { max: 0.5, prices: { RON: 80.92, EUR: 17.08, USD: 18.52, GBP: 14.61, HUF: 6669.83, BGN: 33.39 } },
      { max: 1, prices: { RON: 83.3, EUR: 17.58, USD: 19.07, GBP: 15.04, HUF: 6866, BGN: 34.37 } },
      { max: 2, prices: { RON: 98.77, EUR: 20.85, USD: 22.61, GBP: 17.84, HUF: 8141.12, BGN: 40.76 } },
      { max: 5, prices: { RON: 143.99, EUR: 30.39, USD: 32.96, GBP: 26, HUF: 11868.38, BGN: 59.42 } },
      { max: 10, prices: { RON: 223.72, EUR: 47.22, USD: 51.21, GBP: 40.4, HUF: 18440.12, BGN: 92.32 } },
      { max: 15, prices: { RON: 326.06, EUR: 68.81, USD: 74.64, GBP: 58.89, HUF: 26875.5, BGN: 134.55 } },
      { max: 20, prices: { RON: 409.36, EUR: 86.4, USD: 93.7, GBP: 73.93, HUF: 33741.5, BGN: 168.92 } },
    ] },
  },
  SI: {
    hd: { rates: [
      { max: 1, prices: { RON: 41.65, EUR: 8.79, USD: 9.53, GBP: 7.52, HUF: 3433, BGN: 17.19 } },
      { max: 2, prices: { RON: 42.84, EUR: 9.04, USD: 9.81, GBP: 7.74, HUF: 3531.09, BGN: 17.68 } },
      { max: 5, prices: { RON: 45.22, EUR: 9.54, USD: 10.35, GBP: 8.17, HUF: 3727.26, BGN: 18.66 } },
      { max: 10, prices: { RON: 51.17, EUR: 10.8, USD: 11.71, GBP: 9.24, HUF: 4217.69, BGN: 21.12 } },
      { max: 15, prices: { RON: 82.11, EUR: 17.33, USD: 18.79, GBP: 14.83, HUF: 6767.92, BGN: 33.88 } },
      { max: 30, prices: { RON: 105.91, EUR: 22.35, USD: 24.24, GBP: 19.13, HUF: 8729.63, BGN: 43.7 } },
    ] },
  },
  ES: {
    hd: { rates: [
      { max: 1, prices: { RON: 39, EUR: 8.23, USD: 8.93, GBP: 7.04, HUF: 3214.58, BGN: 16.09 } },
      { max: 2, prices: { RON: 40, EUR: 8.44, USD: 9.16, GBP: 7.22, HUF: 3297, BGN: 16.51 } },
      { max: 5, prices: { RON: 42, EUR: 8.86, USD: 9.61, GBP: 7.59, HUF: 3461.85, BGN: 17.33 } },
      { max: 10, prices: { RON: 52, EUR: 10.97, USD: 11.9, GBP: 9.39, HUF: 4286.1, BGN: 21.46 } },
      { max: 15, prices: { RON: 66, EUR: 13.93, USD: 15.11, GBP: 11.92, HUF: 5440.05, BGN: 27.23 } },
      { max: 30, prices: { RON: 69, EUR: 14.56, USD: 15.79, GBP: 12.46, HUF: 5687.33, BGN: 28.47 } },
    ] },
    pudo: { rates: [
      { max: 1, prices: { RON: 35, EUR: 7.39, USD: 8.01, GBP: 6.32, HUF: 2884.88, BGN: 14.44 } },
      { max: 2, prices: { RON: 36, EUR: 7.6, USD: 8.24, GBP: 6.5, HUF: 2967.3, BGN: 14.86 } },
      { max: 3, prices: { RON: 38, EUR: 8.02, USD: 8.7, GBP: 6.86, HUF: 3132.15, BGN: 15.68 } },
      { max: 5, prices: { RON: 38, EUR: 8.02, USD: 8.7, GBP: 6.86, HUF: 3132.15, BGN: 15.68 } },
      { max: 10, prices: { RON: 48, EUR: 10.13, USD: 10.99, GBP: 8.67, HUF: 3956.4, BGN: 19.81 } },
      { max: 15, prices: { RON: 75, EUR: 15.83, USD: 17.17, GBP: 13.55, HUF: 6181.88, BGN: 30.95 } },
      { max: 30, prices: { RON: 85, EUR: 17.94, USD: 19.46, GBP: 15.35, HUF: 7006.13, BGN: 35.08 } },
    ] },
  },
  SE: {
    hd: { rates: [
      { max: 1, prices: { RON: 89, EUR: 18.78, USD: 20.37, GBP: 16.07, HUF: 7335.83, BGN: 36.73 } },
      { max: 2, prices: { RON: 91, EUR: 19.21, USD: 20.83, GBP: 16.43, HUF: 7500.68, BGN: 37.55 } },
      { max: 5, prices: { RON: 94, EUR: 19.84, USD: 21.52, GBP: 16.98, HUF: 7747.95, BGN: 38.79 } },
      { max: 10, prices: { RON: 105, EUR: 22.16, USD: 24.03, GBP: 18.96, HUF: 8654.63, BGN: 43.33 } },
      { max: 15, prices: { RON: 140, EUR: 29.55, USD: 32.05, GBP: 25.28, HUF: 11539.5, BGN: 57.77 } },
      { max: 30, prices: { RON: 160, EUR: 33.77, USD: 36.62, GBP: 28.9, HUF: 13188, BGN: 66.02 } },
      { max: 100, prices: { RON: 300, EUR: 63.31, USD: 68.67, GBP: 54.18, HUF: 24727.5, BGN: 123.8 } },
    ] },
  },
  HU: {
    hd: { rates: [
      { max: 1, prices: { RON: 34.92, EUR: 6.84, USD: 8.01, GBP: 6.32, HUF: 2877.34, BGN: 14.41, PLN: 29.33 } },
      { max: 2, prices: { RON: 36.30, EUR: 7.11, USD: 8.32, GBP: 6.57, HUF: 2991.13, BGN: 14.98, PLN: 30.49 } },
      { max: 5, prices: { RON: 39.06, EUR: 7.66, USD: 8.64, GBP: 6.82, HUF: 3104.14, BGN: 15.54, PLN: 32.81 } },
      { max: 10, prices: { RON: 50.11, EUR: 9.82, USD: 10.07, GBP: 7.95, HUF: 3617.88, BGN: 18.11, PLN: 42.09 } },
      { max: 15, prices: { RON: 77.72, EUR: 15.23, USD: 13.23, GBP: 10.45, HUF: 4755.33, BGN: 23.81, PLN: 65.28 } },
      { max: 30, prices: { RON: 126.71, EUR: 24.84, USD: 29.07, GBP: 22.95, HUF: 10444.64, BGN: 52.29, PLN: 106.44 } },
    ] },
    pudo: { rates: [
      { max: 5, prices: { RON: 17.67, EUR: 3.46, USD: 4.05, GBP: 3.2, HUF: 1455.74, BGN: 7.29, PLN: 14.84 } },
      { max: 10, prices: { RON: 19.05, EUR: 3.73, USD: 4.38, GBP: 3.48, HUF: 1569.2, BGN: 7.85, PLN: 16.00 } },
      { max: 15, prices: { RON: 37.00, EUR: 7.25, USD: 8.51, GBP: 6.75, HUF: 3048.5, BGN: 15.25, PLN: 31.08 } },
    ] },
  },
};

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

  // 1. General Weight Limit (15kg for most)
  let maxWeight = 15;
  if (code === 'CY' && service.name.includes('BoxNow')) maxWeight = 7;
  if (code === 'RO' || code === 'DE') maxWeight = 30; // Romania and Germany are usually more relaxed
  if (weight > maxWeight) return false;

  // 2. Specialized Locker Dimensions
  const dims = [length, width, height].sort((a, b) => b - a); // [max, mid, min]
  
  // CY/GR BoxNow Locker (62 x 45 x 36 cm)
  const isLocker = service.name.includes('BoxNow') || service.name.includes('InPost');

  if ((code === 'CY' || code === 'GR') && service.name.includes('BoxNow')) {
    if (dims[0] > 620 || dims[1] > 450 || dims[2] > 360) return false;
    if (sumLWH > 1430) return false;
    return true; // Use specialized limits only
  }

  // PL InPost Locker (64 x 41 x 38 cm)
  if (code === 'PL' && service.name.includes('InPost')) {
    if (dims[0] > 640 || dims[1] > 410 || dims[2] > 380) return false;
    if (sumLWH > 1430) return false;
    return true; // Use specialized limits only
  }

  // 3. General Carrier Dimensions (70cm max side, 120cm sum)
  let limitMaxSide = 700;
  let limitSumLWH = 1200;

  // Exceptions for CZ / SK
  if (code === 'CZ') {
    limitMaxSide = 1200;
    limitSumLWH = 1500;
  }
  if (code === 'SK' || code === 'DE') {
    if (service.type === 'pudo') {
      limitMaxSide = 1200;
      limitSumLWH = 1500;
    } else {
      limitMaxSide = 700;
      limitSumLWH = 1200;
    }
  }

  if (maxSide > limitMaxSide) return false;
  if (sumLWH > limitSumLWH) return false;

  return true;
}

export function getShippingServices(countryCode: string, type: 'hd' | 'pudo'): ShippingService[] {
  const country = COUNTRY_SERVICES[countryCode.toUpperCase()] || COUNTRY_SERVICES.DEFAULT;
  return country[type] || [];
}

export function getLocalizedServiceName(service: ShippingService, locale: string = 'ro', t?: any) {
  const isLocker = service.name.includes('Locker') || service.name.includes('Box') || service.name.includes('Easybox') || service.name.includes('Paczkomaty');
  const isSelfDescriptive = service.name.includes('Sameday') || service.name.includes('FAN Courier');
  
  if (isSelfDescriptive) {
    return locale === 'en'
      ? service.name.replace(/(\d+(?:-\d+)?)\s*Zile/gi, '$1 Days')
      : service.name;
  }

  let suffix = '';
  
  if (t) {
    if (service.type === 'hd') {
      suffix = t('shipping_home_suffix');
    } else if (isLocker) {
      suffix = t('shipping_locker_suffix');
    } else {
      suffix = t('shipping_pudo_suffix');
    }
  } else {
    // Fallback if 't' is not provided
    if (service.type === 'hd') {
      suffix = locale === 'ro' ? ' (Acasă)' : ' (Home)';
    } else if (isLocker) {
      suffix = locale === 'ro' ? ' (Lockere & Box)' : ' (Lockers & Box)';
    } else {
      suffix = locale === 'ro' ? ' (Punct Ridicare)' : ' (Pick-up Point)';
    }
  }
  
  return `${service.name}${suffix}`;
}

/**
 * 🚢 ELITE SHIPPING CALCULATION
 * Logic: (BaseByWeight + NonDepozitSurcharge) * (1 + FuelSurcharge) * 1.19
 */
export function getShippingCost(countryCode: string, shippingType: 'hd' | 'pudo', totalWeight: number = 1, targetCurrency: string = 'RON', serviceId?: string): number {
  const code = countryCode.toUpperCase();
  const safeCurrency = targetCurrency.toUpperCase();

  const countryData = SHIPPING_RATES[code] || SHIPPING_RATES['DEFAULT'];
  if (!countryData) return 15; // Fallback

  const config = countryData[shippingType];
  if (!config) return 15; // Fallback for unsupported type

  // Find correct weight bracket
  const bracket = config.rates.find(r => totalWeight <= r.max) || config.rates[config.rates.length - 1];
  if (bracket.prices[safeCurrency]) {
    return bracket.prices[safeCurrency];
  }

  // Fallback for currencies not pre-generated in the matrix (like PLN, CZK, SEK)
  if (bracket.prices['RON']) {
    return convertFromRon(bracket.prices['RON'], safeCurrency);
  }

  return 15; // Emergency fallback
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
  return s ? getLocalizedServiceName(s, locale) : (locale === 'ro' ? 'Packeta' : 'Packeta');
}

export function getInternationalPudoId(countryCode: string) {
  return getShippingServices(countryCode, 'pudo')[0]?.id || 'packeta';
}

export function getInternationalPudoName(countryCode: string, locale: string = 'ro') {
  const s = getShippingServices(countryCode, 'pudo')[0];
  return s ? getLocalizedServiceName(s, locale) : (locale === 'ro' ? 'Packeta' : 'Packeta');
}
