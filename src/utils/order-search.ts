/**
 * Admin Orders Search & Historical Classification Helpers
 * Zero blind spots: diacritic-insensitive, whitespace-normalized, phone prefix normalized (+40 / 0),
 * and full historical snapshot fidelity (never reclassifies closed/shipped/AWB orders using live stock).
 */

export function stripDiacritics(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function normalizeSearchText(value: unknown): string {
  return stripDiacritics(String(value ?? ''))
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePhoneDigits(phone: unknown): { digits: string; roNormalized: string } {
  const digits = String(phone ?? '').replace(/\D/g, '');
  if (!digits) return { digits: '', roNormalized: '' };
  // Convert 0040 / +40 / 40 prefix and leading 0 into common subscriber tail for RO matching
  const withoutRoCode = digits.length > 9 && (digits.startsWith('0040') || digits.startsWith('40'))
    ? digits.replace(/^0040|^40/, '')
    : digits;
  const roNormalized = withoutRoCode.replace(/^0+/, '');
  return { digits, roNormalized };
}

function resolveAnyText(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number') return String(val);
  if (Array.isArray(val)) return val.map(resolveAnyText).filter(Boolean).join(' ');
  if (typeof val === 'object') {
    return Object.values(val).map(resolveAnyText).filter(Boolean).join(' ');
  }
  return '';
}

export function isOrderDeliveredStatus(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o || o.status === 'cancelled' || o.status === 'anulata') return false;
  if (o.status === 'delivered') return true;
  const trackInfo =
    (trackingMap && (trackingMap[o.id] || (o.supabaseId ? trackingMap[o.supabaseId] : null))) ||
    o.trackingMetadata;
  return Boolean(
    trackInfo?.delivered ||
      trackInfo?.statusCode === 7 ||
      trackInfo?.statusText?.toLowerCase().includes('livrat') ||
      trackInfo?.statusText?.toLowerCase().includes('delivered') ||
      trackInfo?.statusText?.toLowerCase().includes('ramburs')
  );
}

/**
 * Returns true if the order is already closed / shipped / returned / refunded / cancelled
 * or already has an active AWB tracking number assigned.
 */
export function isOrderClosedOrShipped(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o) return false;
  const st = String(o.status || '').toLowerCase().trim();
  const closedStatuses = [
    'delivered',
    'shipped',
    'returned',
    'refunded',
    'cancelled',
    'completed',
    'in_transit',
    'livrat',
    'anulata',
    'returnata',
    'expediata',
  ];
  if (closedStatuses.includes(st)) return true;
  if (Boolean(o.trackingNumber && String(o.trackingNumber).trim())) return true;
  if (isOrderDeliveredStatus(o, trackingMap)) return true;
  return false;
}

/**
 * Determines whether a specific order item reflects preorder status from its SAVED order-time snapshot.
 * Deliberately avoids scanning live catalog options so historical orders are not mutated when catalog changes.
 */
export function isItemSnapshotPreorder(item: any): boolean {
  if (!item) return false;
  if (item.stock_status === 'preorder' || item.is_preorder === true) return true;
  if (item.selectedVariant?.stock_status === 'preorder') return true;
  const vName = resolveAnyText(item.selectedVariant?.name ?? item.variant).toLowerCase();
  return vName.includes('precomand') || vName.includes('pre-order') || vName.includes('preorder');
}

/**
 * Classifies whether an order belongs strictly in the active unshipped Precomenzi bucket.
 * RULE: Closed / shipped / delivered / returned / refunded / cancelled / active-AWB orders are NEVER
 * hidden from normal tabs into Precomenzi due to live catalog changes.
 */
export function classifyOrderIsActivePreorder(o: any, trackingMap?: Record<string, any>): boolean {
  if (!o) return false;

  // Never hide already closed, shipped, returned, cancelled, or AWB-assigned orders from normal tabs
  if (isOrderClosedOrShipped(o, trackingMap)) {
    return false;
  }

  // If admin explicitly released this preorder to processing/fulfillment, it is no longer held in active Precomenzi
  const st = String(o.status || '').toLowerCase().trim();
  const isExplicitlyReleased = Boolean(
    o.carrierMetadata?.preorder_released === true ||
      o.carrier_metadata?.preorder_released === true ||
      o.preorderReleased === true
  );
  if (st !== 'preorder' && isExplicitlyReleased) {
    return false;
  }

  // Prefer immutable snapshot stored at order creation time
  const recordedSnapshot =
    typeof o.isPreorderSnapshot === 'boolean'
      ? o.isPreorderSnapshot
      : typeof o.carrierMetadata?.is_preorder === 'boolean'
        ? o.carrierMetadata.is_preorder
        : typeof o.carrier_metadata?.is_preorder === 'boolean'
          ? o.carrier_metadata.is_preorder
          : undefined;

  if (typeof recordedSnapshot === 'boolean') {
    return recordedSnapshot;
  }

  if (o.status === 'preorder' || o.is_preorder === true || o.isPreorder === true) {
    return true;
  }

  if (!Array.isArray(o.items)) return false;
  return o.items.some(isItemSnapshotPreorder);
}

/**
 * Returns true if the order should be shown inside the Precomenzi tab when clicked directly
 * (includes both active unshipped preorders AND orders originally created as preorders).
 */
export function classifyOrderHistoricalOrActivePreorder(o: any): boolean {
  if (!o) return false;
  if (typeof o.isPreorderSnapshot === 'boolean') return o.isPreorderSnapshot;
  if (typeof o.carrierMetadata?.is_preorder === 'boolean') return o.carrierMetadata.is_preorder;
  if (typeof o.carrier_metadata?.is_preorder === 'boolean') return o.carrier_metadata.is_preorder;
  if (o.status === 'preorder' || o.is_preorder === true || o.isPreorder === true) return true;
  if (!Array.isArray(o.items)) return false;
  return o.items.some(isItemSnapshotPreorder);
}

/**
 * Zero-blind-spot admin search across:
 * - Order ID (TZ-... / ODIN-...) & DB UUID
 * - Customer first/last/full name, email, normalized phone (+40 / leading 0)
 * - AWB / tracking number
 * - payment_intent_id (pi_...) & stripe_charge_id (ch_...)
 * - stripe_receipt_number (#XXXX-XXXX and XXXX-XXXX and raw digits)
 * - Coupon code / coupon ID
 * - Full address / city / county / state / zip / country / locker / branch
 * - Oblio invoice series & number
 * - Item names, IDs, SKUs & variants/flavors
 */
export function matchesAdminOrderSearch(order: any, rawQuery: string): boolean {
  const qNorm = normalizeSearchText(rawQuery);
  if (!qNorm) return true;

  const qCompact = qNorm.replace(/[#\s-]/g, '');

  const carrierMeta = order?.carrierMetadata || order?.carrier_metadata || {};
  const receiptRaw = String(
    order?.stripeReceiptNumber || carrierMeta?.stripe_receipt_number || ''
  ).trim();
  const receiptNoHash = receiptRaw.replace(/^#/, '');

  const invoiceSeries = String(order?.oblioInvoice?.seriesName || '').trim();
  const invoiceNum = String(order?.oblioInvoice?.number || '').trim();
  const invoiceCombined = invoiceSeries && invoiceNum ? `${invoiceSeries} ${invoiceNum} ${invoiceSeries}${invoiceNum}` : '';

  const itemsTokens = (Array.isArray(order?.items) ? order.items : []).flatMap((it: any) => [
    resolveAnyText(it?.name),
    resolveAnyText(it?.selectedVariant?.name ?? it?.selectedVariant),
    resolveAnyText(it?.variant),
    resolveAnyText(it?.selectedFlavors),
    resolveAnyText(it?.flavors),
    String(it?.id || ''),
    String(it?.slug || ''),
  ]);

  const textCandidates = [
    order?.id,
    order?.supabaseId,
    order?.customer,
    order?.customerFirstName,
    order?.customerLastName,
    order?.customerEmail,
    order?.phone,
    order?.customerPhone,
    order?.trackingNumber,
    order?.paymentIntentId,
    order?.rawPaymentIntentId,
    carrierMeta?.order_number,
    carrierMeta?.stripe_charge_id,
    order?.stripeChargeId,
    receiptRaw ? `#${receiptNoHash}` : '',
    receiptNoHash,
    order?.couponCode,
    order?.couponId,
    carrierMeta?.coupon_code,
    order?.address,
    order?.addrLine1,
    order?.addrLine2,
    order?.addrCity,
    order?.addrState,
    order?.addrCounty,
    order?.addrZip,
    order?.addrCountry,
    order?.branchName,
    order?.branchId,
    carrierMeta?.locker_id,
    invoiceCombined,
    ...itemsTokens,
  ];

  const normalizedHaystack = textCandidates
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(' | ');

  if (normalizedHaystack.includes(qNorm)) {
    return true;
  }

  // Compact token match (handles #1234-5678 vs 12345678, TZ0001 vs TZ-0001, series+number, etc.)
  const compactHaystack = qCompact.length >= 3 || qNorm.includes(' ')
    ? normalizedHaystack.replace(/[#\s-]/g, '')
    : '';
  if (qCompact.length >= 3 && compactHaystack.includes(qCompact)) {
    return true;
  }

  // Multi-word token matching (e.g. "Popescu Ion", "stefanescu tepes", "X10 Bucuresti")
  const qTokens = qNorm.split(' ').filter((t) => t.length > 0);
  if (
    qTokens.length > 1 &&
    qTokens.every((tok) => {
      if (normalizedHaystack.includes(tok)) return true;
      const cleanTok = tok.replace(/[#-]/g, '');
      return cleanTok.length >= 2 && compactHaystack.includes(cleanTok);
    })
  ) {
    return true;
  }

  // Phone normalized match (+40 712 345 678 <-> 0712 345 678 <-> 712345678)
  const isPhoneLikeQuery = /^[+\d\s().-]+$/.test(rawQuery.trim());
  if (isPhoneLikeQuery) {
    const { digits: qDigits, roNormalized: qRo } = normalizePhoneDigits(rawQuery);
    if (qRo.length >= 4 || qDigits.length >= 4) {
      for (const candidatePhone of [order?.phone, order?.customerPhone]) {
        const { digits, roNormalized } = normalizePhoneDigits(candidatePhone);
        if (!digits) continue;
        if (
          (qDigits.length >= 4 && digits.includes(qDigits)) ||
          (qRo.length >= 4 && roNormalized.includes(qRo))
        ) {
          return true;
        }
      }
    }
  }

  return false;
}
