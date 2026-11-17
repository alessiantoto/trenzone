export type AdminNavIconKey =
  | 'dashboard'
  | 'orders'
  | 'preorders'
  | 'analytics'
  | 'products'
  | 'programs'
  | 'abandonedCarts'
  | 'returns'
  | 'invoices'
  | 'shipping'
  | 'customers'
  | 'leads'
  | 'reviews'
  | 'broadcast'
  | 'promo'
  | 'coupons'
  | 'affiliates'
  | 'influencers'
  | 'emails'
  | 'settings';

export interface AdminNavItem {
  name: string;
  path: string;
  iconKey: AdminNavIconKey;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

/**
 * Single source of truth for TrenZone Admin navigation (desktop sidebar + mobile drawer).
 * Ordered by daily merchant workflow frequency.
 */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: 'daily',
    label: 'Zilnic',
    items: [
      { name: 'Dashboard', path: '/admin', iconKey: 'dashboard' },
      { name: 'Comenzi', path: '/admin/orders', iconKey: 'orders' },
      { name: 'Raport Fulfillment', path: '/admin/fulfillment', iconKey: 'shipping' },
      { name: 'Precomenzi', path: '/admin/preorders', iconKey: 'preorders' },
      { name: 'Web Analytics', path: '/admin/analytics', iconKey: 'analytics' },
    ],
  },
  {
    id: 'catalog-logistics',
    label: 'Catalog & Logistică',
    items: [
      { name: 'Produse', path: '/admin/products', iconKey: 'products' },
      { name: 'Programe PDF', path: '/admin/programs', iconKey: 'programs' },
      { name: 'Coșuri Abandonate', path: '/admin/abandoned-carts', iconKey: 'abandonedCarts' },
      { name: 'Retururi', path: '/admin/returns', iconKey: 'returns' },
      { name: 'Facturi Oblio', path: '/admin/invoices', iconKey: 'invoices' },
      { name: 'Curieri & Livrare', path: '/admin/shipping', iconKey: 'shipping' },
    ],
  },
  {
    id: 'customers-support',
    label: 'Clienți & Suport',
    items: [
      { name: 'Clienți', path: '/admin/customers', iconKey: 'customers' },
      { name: 'Mesaje Contact', path: '/admin/leads', iconKey: 'leads' },
      { name: 'Recenzii', path: '/admin/reviews', iconKey: 'reviews' },
    ],
  },
  {
    id: 'marketing-partners',
    label: 'Marketing & Parteneri',
    items: [
      { name: 'Campanii & Abonați', path: '/admin/marketing/broadcast', iconKey: 'broadcast' },
      { name: 'Pop-up & Scratch', path: '/admin/marketing/promo', iconKey: 'promo' },
      { name: 'Cupoane & Reduceri', path: '/admin/coupons', iconKey: 'coupons' },
      { name: 'Afiliați', path: '/admin/affiliates', iconKey: 'affiliates' },
      { name: 'Influenceri', path: '/admin/influencers', iconKey: 'influencers' },
      { name: 'Email-uri Automate', path: '/admin/emails', iconKey: 'emails' },
    ],
  },
  {
    id: 'system',
    label: 'Sistem',
    items: [
      { name: 'Setări Magazin', path: '/admin/settings', iconKey: 'settings' },
    ],
  },
];

export function isAdminNavPathActive(pathname: string, itemPath: string): boolean {
  if (!pathname) return false;
  if (itemPath === '/admin') {
    return pathname === '/admin';
  }
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export function findActiveAdminNav(
  pathname: string
): { group: AdminNavGroup; item: AdminNavItem } | null {
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      if (isAdminNavPathActive(pathname, item.path)) {
        return { group, item };
      }
    }
  }
  return null;
}
