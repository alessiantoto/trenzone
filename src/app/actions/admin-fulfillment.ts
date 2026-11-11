'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { revalidatePath, revalidateTag } from 'next/cache';
import { 
  FulfillmentSettings, 
  FulfillmentDispatchLog, 
  FulfillmentOrderSummary, 
  FulfillmentItemSummary 
} from '@/types/fulfillment';
import { sendFulfillmentDispatchEmail, buildFulfillmentDispatchSubject } from '@/lib/resend-service';
import { getSingleFlavorImage } from '@/lib/product-images';
import { getCanonicalOrderNumber } from '@/utils/admin-helpers';
import { headers } from 'next/headers';

async function isAdminOrCronAuthorized(): Promise<boolean> {
  if (await isAdminAuthorized()) return true;
  try {
    const h = await headers();
    const authHeader = h.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
  } catch {
    // Ignore headers error outside request context
  }
  return false;
}

const DEFAULT_SETTINGS: FulfillmentSettings = {
  email: 'curierat@tceholding.ro',
  secondary_email: 'admin@trenzone.fit',
  manual_shipping_enabled: true,
  auto_dispatch_enabled: true,
  auto_dispatch_time: '08:00',
  last_dispatched_at: null,
  notes: 'TCE Holding Curierat & Logistică'
};

/**
 * Get current fulfillment settings from store_settings
 */
export async function getFulfillmentSettings(): Promise<FulfillmentSettings> {
  try {
    const isAuth = await isAdminOrCronAuthorized();
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'fulfillment_settings')
      .maybeSingle();

    if (error || !data || !data.value) {
      return DEFAULT_SETTINGS;
    }

    if (!isAuth) {
      return {
        ...DEFAULT_SETTINGS,
        manual_shipping_enabled: Boolean(data.value.manual_shipping_enabled),
        auto_dispatch_enabled: Boolean(data.value.auto_dispatch_enabled),
      };
    }

    return {
      ...DEFAULT_SETTINGS,
      ...data.value
    };
  } catch (err) {
    console.error('Error fetching fulfillment settings:', err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Update fulfillment settings (email, manual_shipping_enabled, auto_dispatch, etc.)
 */
export async function updateFulfillmentSettings(partial: Partial<FulfillmentSettings>) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) throw new Error('Neautorizat');

  const current = await getFulfillmentSettings();
  const updated: FulfillmentSettings = {
    ...current,
    ...partial
  };

  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({
      key: 'fulfillment_settings',
      value: updated
    });

  if (error) {
    console.error('Error updating fulfillment settings:', error);
    throw new Error(error.message);
  }

  // Also sync manual_shipping_enabled to global_settings if needed
  try {
    revalidateTag('global_settings', 'max');
    revalidatePath('/admin/orders');
    revalidatePath('/admin/settings');
    revalidatePath('/admin/shipping');
  } catch (_) {}

  return { success: true, settings: updated };
}

/**
 * Get dispatch logs history
 */
export async function getFulfillmentHistory(): Promise<FulfillmentDispatchLog[]> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return [];

  try {
    const { data, error } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'fulfillment_history')
      .maybeSingle();

    if (error || !data || !data.value || !Array.isArray(data.value)) {
      return [];
    }

    // Sort descending by sent_at
    return (data.value as FulfillmentDispatchLog[]).sort((a, b) => 
      new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime()
    );
  } catch (err) {
    console.error('Error fetching fulfillment history:', err);
    return [];
  }
}

/**
 * Helper to transform DB order to FulfillmentOrderSummary
 */
function formatOrderForFulfillment(order: any): FulfillmentOrderSummary {
  const displayId = getCanonicalOrderNumber(order);

  const rawCurrency = String(order.currency || 'RON').trim().toUpperCase();
  const totalAmount = Number(order.total_amount || 0);
  const formattedTotal = `${totalAmount.toFixed(2)} ${rawCurrency}`;

  const rawItems = Array.isArray(order.items) ? order.items : [];
  const items: FulfillmentItemSummary[] = rawItems.map((item: any) => {
    let name = 'Produs';
    if (item && typeof item.name === 'object' && item.name !== null) {
      name = item.name['ro'] || item.name['en'] || 'Produs';
    } else if (item && item.name) {
      name = String(item.name);
    }

    const variantRaw = item?.selectedVariant?.name || item?.variant || null;
    const variantStr = typeof variantRaw === 'object' && variantRaw !== null
      ? String(variantRaw['ro'] || variantRaw['en'] || Object.values(variantRaw as any)[0] || '')
      : String(variantRaw || '');

    const isBundle = String(item?.id || '').includes('-bundle-') ||
                     Boolean(item?._isBundle) ||
                     name.toLowerCase().includes('pachet') ||
                     name.toLowerCase().includes('bundle');

    let image = item?.image || item?.selectedVariant?.image || null;
    if (typeof image === 'string') {
      image = image.replace(/^https?:\/\/(www\.)?trenzone\.ro/, '');
    }
    
    // Smart image resolution for store products
    if (!image || String(image).includes('placeholder')) {
      const lower = `${name} ${variantStr}`.toLowerCase();
      if (lower.includes('x10')) {
        if (lower.includes('white') || lower.includes('alb')) {
          image = '/images/products/x10_elbow_wraps_white_1.webp';
        } else {
          image = '/images/products/x10_elbow_wraps_purple_1.webp';
        }
      } else if (lower.includes('x5')) {
        if (lower.includes('red') || lower.includes('rosu')) {
          image = '/images/products/x5_elbow_wraps_red_1.webp';
        } else if (lower.includes('blue') || lower.includes('albastru')) {
          image = '/images/products/x5_elbow_wraps_blue_1.webp';
        } else {
          image = '/images/products/x5_elbow_wraps_purple_1.webp';
        }
      } else if (isBundle) {
        image = '/images/products/x10_elbow_wraps_purple_1.webp';
      } else {
        image = getSingleFlavorImage(variantStr || name);
      }
    }

    return {
      name,
      variant: variantStr || undefined,
      quantity: Number(item?.quantity || 1),
      sku: item?.sku || item?.id || undefined,
      image: image || undefined
    };
  });

  const address = `${order.addr_line1 || ''} ${order.addr_line2 || ''}`.trim() || 'N/A';
  const customerName = `${order.customer_firstname || ''} ${order.customer_lastname || ''}`.trim() || 'Client';

  return {
    id: displayId,
    supabaseId: order.id,
    date: order.created_at ? new Date(order.created_at).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'N/A',
    customer: customerName,
    customerEmail: order.customer_email || 'N/A',
    customerPhone: order.customer_phone || 'N/A',
    address,
    city: order.addr_city || 'N/A',
    zip: order.addr_zip || '',
    country: order.addr_country || 'RO',
    total: formattedTotal,
    totalAmount,
    currency: rawCurrency,
    paymentMethod: order.payment_method || 'stripe',
    priorityProcessing: Boolean(order.priority_processing),
    giftPackaging: Boolean(order.gift_packaging),
    giftMessage: order.gift_message || null,
    shippingType: order.shipping_type || 'hd',
    items
  };
}

function isOrderPreorder(order: any): boolean {
  if (order.status === 'preorder' || order.carrier_metadata?.is_preorder) {
    return true;
  }
  const rawItems = Array.isArray(order.items) ? order.items : [];
  return rawItems.some((item: any) => {
    if (item?.stock_status === 'preorder' || item?.is_preorder) return true;
    if (item?.selectedVariant?.stock_status === 'preorder') return true;
    const vName = typeof item?.selectedVariant?.name === 'object'
      ? item.selectedVariant.name.ro || item.selectedVariant.name.en || ''
      : String(item?.selectedVariant?.name || item?.variant || '');
    return vName.toLowerCase().includes('precomand') || vName.toLowerCase().includes('pre-order');
  });
}

/**
 * Get orders ready for fulfillment (filters out already dispatched orders to prevent duplicates and holds back preorders)
 */
export async function getFulfillmentOrdersReady(
  orderIds?: string[],
  options?: { includeAlreadyDispatched?: boolean; includePreorders?: boolean }
): Promise<FulfillmentOrderSummary[]> {
  try {
    const isAuthorized = await isAdminOrCronAuthorized();
    if (!isAuthorized) return [];

    let query = supabaseAdmin
      .from('orders')
      .select('*')
      .not('status', 'in', '("cancelled","refunded","returned")')
      .order('created_at', { ascending: false });

    if (orderIds && orderIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuids = orderIds.filter(id => uuidRegex.test(id));
      if (uuids.length > 0) {
        query = query.in('id', uuids);
      }
    }

    const { data, error } = await query;
    if (error || !data) return [];

    // Filter to strictly prevent duplicate dispatches and premature preorder dispatching
    const filtered = data.filter(order => {
      // If specific order IDs were explicitly requested by admin, let them through
      if (orderIds && orderIds.length > 0) return true;

      // Duplicate prevention: if already dispatched to fulfillment, skip it!
      if (!options?.includeAlreadyDispatched && order.carrier_metadata?.fulfillment_dispatched_at) {
        return false;
      }

      // Preorders stay in waiting queue until production batch arrives
      if (!options?.includePreorders && isOrderPreorder(order)) {
        return false;
      }

      return true;
    });

    return filtered.map(formatOrderForFulfillment);
  } catch (err) {
    console.error('Error in getFulfillmentOrdersReady:', err);
    return [];
  }
}

/**
 * Get count of orders waiting for fulfillment vs already dispatched
 */
export async function getFulfillmentPendingCount(): Promise<{ pendingCount: number; dispatchedCount: number }> {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { pendingCount: 0, dispatchedCount: 0 };

  try {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('id, status, carrier_metadata, items')
      .not('status', 'in', '("cancelled","refunded","returned")');

    if (!data) return { pendingCount: 0, dispatchedCount: 0 };

    let pendingCount = 0;
    let dispatchedCount = 0;

    for (const o of data) {
      if (o.carrier_metadata?.fulfillment_dispatched_at) {
        dispatchedCount++;
      } else {
        // Only count as pending fulfillment if it's not a pre-order waiting on production
        if (!isOrderPreorder(o)) {
          pendingCount++;
        }
      }
    }

    return { pendingCount, dispatchedCount };
  } catch (err) {
    return { pendingCount: 0, dispatchedCount: 0 };
  }
}

/**
 * Generate standardized CSV content for warehouse fulfillment systems (Excel compatible with UTF-8 BOM)
 */
export async function generateFulfillmentCsv(orders: FulfillmentOrderSummary[]): Promise<string> {
  const escapeCell = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val).trim();
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Nr_Comanda',
    'Data',
    'Tara',
    'Destinatar',
    'Telefon',
    'Email',
    'Adresa_Livrare',
    'Oras',
    'Cod_Postal',
    'Tip_Livrare',
    'Metoda_Plata',
    'Total',
    'Moneda',
    'Ramburs_De_Incasat',
    'Produs',
    'Varianta_Culoare',
    'Cantitate',
    'SKU',
    'Prioritate',
    'Ambalaj_Cadou',
    'Mesaj_Cadou'
  ];

  const rows: string[] = [];
  rows.push(headers.join(','));

  for (const o of orders) {
    const isCod = o.paymentMethod === 'cod';
    const codAmount = isCod ? o.total : '0';
    const isPriority = o.priorityProcessing ? 'DA' : 'NU';
    const isGift = o.giftPackaging ? 'DA' : 'NU';

    for (const item of (o.items || [])) {
      const row = [
        escapeCell(o.id),
        escapeCell(o.date),
        escapeCell(o.country || 'RO'),
        escapeCell(o.customer),
        escapeCell(o.customerPhone),
        escapeCell(o.customerEmail),
        escapeCell(o.address),
        escapeCell(o.city),
        escapeCell(o.zip),
        escapeCell(o.shippingType === 'pudo' ? 'Locker / Punct Fix' : 'Livrare la Domiciliu'),
        escapeCell(isCod ? 'Ramburs (La Livrare)' : 'Card Stripe (Achitat)'),
        escapeCell(o.total),
        escapeCell(o.currency),
        escapeCell(codAmount),
        escapeCell(item.name),
        escapeCell(item.variant || 'Standard'),
        escapeCell(item.quantity),
        escapeCell(item.sku || ''),
        escapeCell(isPriority),
        escapeCell(isGift),
        escapeCell(o.giftMessage || '')
      ];
      rows.push(row.join(','));
    }
  }

  // Prepend UTF-8 BOM so Excel opens it with proper diacritics
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Provide sample preview orders with real store products & images, split by country
 */
export async function getFulfillmentPreviewOrders(options?: { includeAlreadyDispatched?: boolean }): Promise<FulfillmentOrderSummary[]> {
  const isAuthorized = await isAdminOrCronAuthorized();
  if (!isAuthorized) return [];

  // First check if there are pending orders that haven't been dispatched yet
  const pendingOrders = await getFulfillmentOrdersReady(undefined, { includeAlreadyDispatched: false });
  if (pendingOrders.length > 0) {
    return pendingOrders;
  }

  // If no pending orders, check if there are any orders in the DB (including dispatched) so preview template is populated
  const anyOrders = await getFulfillmentOrdersReady(undefined, { includeAlreadyDispatched: true });
  if (anyOrders.length > 0) {
    return anyOrders.slice(0, 10);
  }

  // High-fidelity sample orders with real store products (X10 Elbow Wraps, X5 Elbow Wraps) and actual Supabase images
  return [
    {
      id: 'TZ-2026-1041',
      supabaseId: 'sample-uuid-1',
      date: new Date().toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Alexandru Popescu',
      customerEmail: 'alexandru.popescu@gmail.com',
      customerPhone: '0722123456',
      address: 'Strada Victoriei nr. 42, Bl. B2, Ap. 14',
      city: 'București, Sector 1',
      zip: '010061',
      country: 'RO',
      total: '249.00 RON',
      totalAmount: 249.00,
      currency: 'RON',
      paymentMethod: 'cod',
      priorityProcessing: true,
      giftPackaging: false,
      giftMessage: null,
      shippingType: 'hd',
      items: [
        {
          name: 'X10 Elbow Wraps',
          variant: 'Purple',
          quantity: 2,
          sku: 'X10-WRAP-PUR',
          image: '/images/products/x10_elbow_wraps_purple_1.webp'
        },
        {
          name: 'X5 Elbow Wraps',
          variant: 'Red',
          quantity: 1,
          sku: 'X5-WRAP-RED',
          image: '/images/products/x5_elbow_wraps_red_1.webp'
        }
      ]
    },
    {
      id: 'TZ-2026-1042',
      supabaseId: 'sample-uuid-2',
      date: new Date(Date.now() - 3600000 * 2).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Elena Mihăilescu',
      customerEmail: 'elena.mihailescu@yahoo.com',
      customerPhone: '0744987654',
      address: 'Bulevardul Eroilor nr. 15, Sc. A, Ap. 3',
      city: 'Cluj-Napoca',
      zip: '400129',
      country: 'RO',
      total: '129.00 RON',
      totalAmount: 129.00,
      currency: 'RON',
      paymentMethod: 'stripe',
      priorityProcessing: false,
      giftPackaging: true,
      giftMessage: 'Succes la antrenamente!',
      shippingType: 'hd',
      items: [
        {
          name: 'X5 Elbow Wraps',
          variant: 'Blue',
          quantity: 1,
          sku: 'X5-WRAP-BLU',
          image: '/images/products/x5_elbow_wraps_blue_1.webp'
        }
      ]
    },
    {
      id: 'TZ-2026-1043',
      supabaseId: 'sample-uuid-3',
      date: new Date(Date.now() - 3600000 * 5).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      customer: 'Andrei Cebotari',
      customerEmail: 'andrei.cebotari@mail.md',
      customerPhone: '+37369123456',
      address: 'Bulevardul Ștefan cel Mare nr. 105, Ap. 22',
      city: 'Chișinău',
      zip: 'MD-2004',
      country: 'MD',
      total: '29.00 EUR',
      totalAmount: 29.00,
      currency: 'EUR',
      paymentMethod: 'stripe',
      priorityProcessing: false,
      giftPackaging: false,
      giftMessage: null,
      shippingType: 'hd',
      items: [
        {
          name: 'X10 Elbow Wraps',
          variant: 'White',
          quantity: 1,
          sku: 'X10-WRAP-WHT',
          image: '/images/products/x10_elbow_wraps_white_1.webp'
        }
      ]
    }
  ];
}

/**
 * Helper to compute high-clarity subject line for preview or client display
 */
export async function getFulfillmentFormattedSubject(
  orders: FulfillmentOrderSummary[],
  trigger?: 'manual' | 'scheduled_8am'
): Promise<string> {
  const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
  const roCount = orders.filter(o => {
    const c = (o.country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  }).length;
  const intCount = orders.length - roCount;

  return buildFulfillmentDispatchSubject({
    ordersCount: orders.length,
    totalItemsCount: totalItems,
    sentAt: new Date(),
    trigger: trigger || 'scheduled_8am',
    roCount,
    intCount
  });
}

/**
 * Dispatch orders to fulfillment center email (manual or automated cron)
 */
export async function dispatchOrdersToFulfillment(options?: {
  orderIds?: string[];
  notes?: string;
  trigger?: 'manual' | 'scheduled_8am';
}) {
  const trigger = options?.trigger || 'manual';

  const isAuthorized = trigger === 'manual'
    ? await isAdminAuthorized()
    : await isAdminOrCronAuthorized();
  if (!isAuthorized) {
    return { success: false, error: 'Neautorizat' };
  }

  const settings = await getFulfillmentSettings();
  if (!settings.email || !settings.email.trim()) {
    return {
      success: false,
      error: 'Adresa de email a centrului de fulfillment nu este setată! Te rugăm să o configurezi mai întâi.'
    };
  }

  // Get orders to dispatch
  let orders = await getFulfillmentOrdersReady(options?.orderIds);

  // If no new orders exist (or all already dispatched), we don't send duplicate lists
  if (orders.length === 0) {
    return {
      success: true,
      count: 0,
      message: 'Toate comenzile active au fost deja transmise către fulfillment. Nu există comenzi noi de trimis (protecție anti-duplicate activă).'
    };
  }

  const sentAt = new Date().toISOString();
  const dateStr = sentAt.split('T')[0];

  const totalItems = orders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);
  const roCount = orders.filter(o => {
    const c = (o.country || 'RO').trim().toUpperCase();
    return c === 'RO' || c === 'ROMANIA' || c === 'ROMÂNIA';
  }).length;
  const intCount = orders.length - roCount;

  const subject = buildFulfillmentDispatchSubject({
    ordersCount: orders.length,
    totalItemsCount: totalItems,
    sentAt,
    trigger,
    roCount,
    intCount
  });

  // Generate CSV attachment
  const csvContent = await generateFulfillmentCsv(orders);
  const csvFilename = `comenzi_trenzone_${dateStr}.csv`;

  // Send email via Resend with CSV attachment and CC to secondary verification email
  const emailRes = await sendFulfillmentDispatchEmail(settings.email.trim(), {
    orders,
    sentAt,
    trigger,
    notes: options?.notes || settings.notes,
    csvContent,
    csvFilename,
    secondaryEmail: settings.secondary_email?.trim() || undefined,
    subject
  });

  if (!emailRes.success) {
    return {
      success: false,
      error: emailRes.error || 'Trimiterea emailului a eșuat.'
    };
  }

  // Record in fulfillment history
  const logEntry: FulfillmentDispatchLog = {
    id: `disp_${Date.now()}`,
    sent_at: sentAt,
    recipient_email: settings.email.trim(),
    secondary_email: settings.secondary_email?.trim() || undefined,
    subject,
    trigger,
    order_count: orders.length,
    orders,
    status: 'sent'
  };

  try {
    const history = await getFulfillmentHistory();
    // Keep last 50 dispatches in store_settings
    const updatedHistory = [logEntry, ...history].slice(0, 50);

    await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'fulfillment_history',
        value: updatedHistory
      });

    // Update last_dispatched_at in fulfillment settings
    await supabaseAdmin
      .from('store_settings')
      .upsert({
        key: 'fulfillment_settings',
        value: {
          ...settings,
          last_dispatched_at: sentAt
        }
      });

    // Mark orders with fulfillment_dispatched_at in carrier_metadata
    const orderUuids = orders.map(o => o.supabaseId).filter(Boolean);
    if (orderUuids.length > 0) {
      for (const uuid of orderUuids) {
        // Fetch current carrier_metadata and update
        const { data: oData } = await supabaseAdmin
          .from('orders')
          .select('carrier_metadata')
          .eq('id', uuid)
          .maybeSingle();

        const currentMeta = oData?.carrier_metadata || {};
        await supabaseAdmin
          .from('orders')
          .update({
            carrier_metadata: {
              ...currentMeta,
              fulfillment_dispatched_at: sentAt,
              fulfillment_dispatched_to: settings.email.trim(),
              fulfillment_dispatch_id: logEntry.id
            }
          })
          .eq('id', uuid);
      }
    }
  } catch (logErr) {
    console.error('Error logging fulfillment dispatch to DB:', logErr);
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/settings');

  return {
    success: true,
    count: orders.length,
    recipient: settings.email.trim(),
    secondaryRecipient: settings.secondary_email?.trim() || null,
    subject,
    sentAt
  };
}
