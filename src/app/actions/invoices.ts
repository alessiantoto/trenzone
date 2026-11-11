'use server';

import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAdminAuthorized } from './admin-auth';
import { issueOblioInvoice, isOblioConfigured, testOblioConnection } from '@/lib/oblio-api';

export async function checkOblioStatusAction() {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  const configured = isOblioConfigured();
  let connectionStatus: { success: boolean; companyName?: string; error?: string } | null = null;

  if (configured) {
    connectionStatus = await testOblioConnection();
  }

  return {
    success: true,
    configured: configured,
    cif: process.env.OBLIO_CIF ? `${process.env.OBLIO_CIF.substring(0, 4)}****` : null,
    series: process.env.OBLIO_SERIES_NAME || 'ODIN',
    connected: connectionStatus?.success || false,
    companyName: connectionStatus?.companyName || null,
    connectionError: connectionStatus?.error || null,
  };
}

export async function emitOblioInvoiceAction(orderId: string) {
  const isAuthorized = await isAdminAuthorized();
  if (!isAuthorized) return { success: false, error: 'Neautorizat' };

  if (!isOblioConfigured()) {
    return {
      success: false,
      error: 'Oblio nu este configurat. Adaugă OBLIO_EMAIL, OBLIO_SECRET și OBLIO_CIF în variabilele de mediu (.env.local).',
    };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
    let query = supabaseAdmin.from('orders').select('*');

    if (isUuid) {
      query = query.eq('id', orderId);
    } else {
      const safeOrderId = String(orderId || '').replace(/[^a-zA-Z0-9_-]/g, '');
      if (!safeOrderId) {
        return { success: false, error: 'ID comandă invalid.' };
      }
      query = query.or(`payment_intent_id.eq.${safeOrderId},receipt_url.ilike.%${safeOrderId}%`);
    }

    const { data: order, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !order) {
      return { success: false, error: 'Comanda nu a fost găsită în baza de date.' };
    }

    if (order.status === 'cancelled' || order.status === 'anulata') {
      return { success: false, error: 'Comenzile anulate (neridicate) nu trebuie și nu pot fi facturate în SPV.' };
    }

    const existingInvoice = order.tracking_metadata?.oblio_invoice;
    if (existingInvoice?.number) {
      return {
        success: true,
        seriesName: existingInvoice.seriesName,
        number: existingInvoice.number,
        link: existingInvoice.link,
        einvoiceStatus: existingInvoice.einvoiceStatus,
      };
    }

    // SPV Smart Safe-Guard:
    // ANAF cere ca factura să fie trimisă în SPV în maxim 5 zile de la emitere.
    // Dacă comanda e mai veche de 4 zile (restanță din urmă), trebuie să o emitem cu o dată recentă.
    // Dacă comanda este de azi/ieri, o lăsăm cum e (Oblio va prelua data exactă din order.created_at).
    if (order.created_at) {
      const orderDate = new Date(order.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      
      if (diffDays > 4) {
        // E o comandă foarte veche. Setăm data emiterii la acum 2 zile pentru siguranță ANAF SPV.
        const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));
        order.issueDate = twoDaysAgo.toISOString().split('T')[0];
      }
    }

    const result = await issueOblioInvoice(order);

    if (result.success) {
      // Salvează referința facturii Oblio în baza de date
      const existingMeta = (order.tracking_metadata || {}) as Record<string, any>;
      const oblioInfo = {
        seriesName: result.seriesName,
        number: result.number,
        link: result.link,
        einvoiceStatus: result.einvoiceStatus,
        emittedAt: new Date().toISOString(),
      };

      await supabaseAdmin
        .from('orders')
        .update({
          tracking_metadata: {
            ...existingMeta,
            oblio_invoice: oblioInfo,
          },
        })
        .eq('id', order.id);

      return {
        success: true,
        seriesName: result.seriesName,
        number: result.number,
        link: result.link,
        einvoiceStatus: result.einvoiceStatus,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Eroare la emiterea facturii în Oblio.',
      };
    }
  } catch (err: any) {
    console.error('emitOblioInvoiceAction error:', err);
    return { success: false, error: err.message || 'Eroare necunoscută.' };
  }
}
