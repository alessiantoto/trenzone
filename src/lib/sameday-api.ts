const API_URL = 'https://api.sameday.ro';

let cachedToken: string | null = null;
let tokenExpiresAt: Date | null = null;

export async function getSamedayToken() {
  if (cachedToken && tokenExpiresAt && new Date() < tokenExpiresAt) {
    return cachedToken;
  }

  const username = process.env.SAMEDAY_USERNAME;
  const password = process.env.SAMEDAY_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing SAMEDAY_USERNAME or SAMEDAY_PASSWORD in environment variables');
  }

  try {
    const res = await fetch(`${API_URL}/api/authenticate`, {
      method: 'POST',
      headers: {
        'X-AUTH-USERNAME': username,
        'X-AUTH-PASSWORD': password,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Sameday Auth Error:', errorText);
      throw new Error(`Sameday Auth failed: ${res.status}`);
    }

    const data = await res.json();
    cachedToken = data.token;
    
    // Sameday returns expire_at_utc ("YYYY-MM-DD HH:mm") or expire_at, or expiresAt
    const expireDateStr = data.expire_at_utc || data.expire_at || data.expiresAt;
    if (expireDateStr) {
      const normalizedIso = data.expire_at_utc 
        ? `${String(data.expire_at_utc).replace(' ', 'T')}Z` 
        : String(data.expire_at || expireDateStr).replace(' ', 'T');
      const parsedTime = new Date(normalizedIso).getTime();
      tokenExpiresAt = !isNaN(parsedTime) 
        ? new Date(parsedTime - 10 * 60000)
        : new Date(Date.now() + 6 * 24 * 3600 * 1000);
    } else {
      tokenExpiresAt = new Date(Date.now() + 6 * 24 * 3600 * 1000);
    }
    
    return cachedToken;
  } catch (err) {
    console.error('Error fetching Sameday token:', err);
    throw err;
  }
}

export async function fetchSamedayPickupPoints() {
  const token = await getSamedayToken();
  const res = await fetch(`${API_URL}/api/client/pickup-points`, {
    headers: { 'X-Auth-Token': token!, 'Accept': 'application/json' },
    cache: 'no-store'
  });
  
  if (!res.ok) throw new Error('Failed to fetch pickup points');
  return res.json();
}

export async function fetchSamedayLockers() {
  const token = await getSamedayToken();
  const res = await fetch(`${API_URL}/api/client/ooh-locations`, {
    headers: { 'X-Auth-Token': token!, 'Accept': 'application/json' },
    next: { revalidate: 3600 } // Cache for 1 hour
  });
  
  if (!res.ok) throw new Error('Failed to fetch lockers');
  return res.json();
}

export async function createSamedayAwb(params: any) {
  const token = await getSamedayToken();
  
  // Try to find the default pickup point if not provided
  let pickupPointId = params.pickupPoint;
  let contactPersonId = params.contactPerson;
  
  if (!pickupPointId) {
    try {
      const pointsData = await fetchSamedayPickupPoints();
      if (pointsData.data && pointsData.data.length > 0) {
        // Use default or first available
        const defaultPoint = pointsData.data.find((p: any) => p.defaultPickupPoint) || pointsData.data[0];
        pickupPointId = defaultPoint.id;
        if (defaultPoint.pickupPointContactPersons && defaultPoint.pickupPointContactPersons.length > 0) {
           const defaultContact = defaultPoint.pickupPointContactPersons.find((c: any) => c.defaultContactPerson) || defaultPoint.pickupPointContactPersons[0];
           contactPersonId = defaultContact.id;
        }
      }
    } catch (e) {
      console.warn("Could not auto-fetch pickup points for Sameday", e);
    }
  }

  let safePhone = (params.recipientPhone || '').trim().replace(/[^0-9+]/g, '');
  if (!safePhone || safePhone === '+' || safePhone === '+40') {
    safePhone = '0700000000';
  }

  const resolvedServiceId = Number(params.serviceId) || (params.lockerId ? 15 : 7);

  const payload = {
    pickupPoint: pickupPointId,
    contactPerson: contactPersonId,
    packageType: 0, // 0 = parcel
    packageWeight: params.weight || 1,
    service: resolvedServiceId, // 7 = Standard, 15 = Easybox
    awbPayment: 1, // 1 = sender pays
    cashOnDelivery: params.codAmount || 0,
    insuredValue: 0, // Required by Sameday API
    thirdPartyPickup: 0, // 0 = false, required by Sameday API
    parcels: [
      {
        sequenceNo: 1,
        weight: params.weight || 1,
        type: 0, // 0 = parcel
        reference1: params.extra?.observation || '',
        dimensions: {
          width: params.width || 20,
          height: params.height || 10,
          length: params.length || 30
        }
      }
    ],
    awbRecipient: {
      name: params.recipientName,
      phoneNumber: safePhone,
      email: params.recipientEmail && params.recipientEmail.trim() !== '' ? params.recipientEmail : 'trenzone483@gmail.com',
      personType: 0, // Physical person
      countyString: params.county,
      cityString: params.city,
      address: params.address,
      postalCode: params.zip
    },
    ...params.extra
  };

  // If Easybox locker is selected
  if (resolvedServiceId === 15 || params.serviceId === '15' || params.lockerId) {
    const numericLockerId = typeof params.lockerId === 'number' ? params.lockerId : parseInt(String(params.lockerId || ''), 10);
    if (!params.lockerId || isNaN(numericLockerId) || numericLockerId <= 0) {
      throw new Error("Locker ID este obligatoriu pentru livrarea la Easybox/PUDO. Cumpărătorul nu a selectat un locker sau datele lipsesc.");
    }
    
    payload.service = 15;
    (payload as any).oohLastMile = numericLockerId;
  }

  console.log('📦 Creating Sameday AWB with payload:', JSON.stringify(payload, null, 2));

  const res = await fetch(`${API_URL}/api/awb`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': token!,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseText = await res.text();
  if (!res.ok) {
    console.error('Sameday AWB Creation Error:', responseText);
    throw new Error(`Sameday AWB Creation failed: ${res.status} - ${responseText}`);
  }

  return JSON.parse(responseText);
}

// getSamedayAwbStatus definition
export async function getSamedayAwbStatus(awbNumber: string) {
  const token = await getSamedayToken();
  try {
    const res = await fetch(`${API_URL}/api/client/awb/${awbNumber}/status`, {
      headers: {
        'X-Auth-Token': token!,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        // Sameday returns 404 for newly generated AWBs before they sync in their tracking DB
        return {
          status: 'În procesare',
          statusText: 'AWB Generat (În procesare la curier)',
          delivered: false,
          error: false
        };
      }
      throw new Error(`Sameday status failed: ${res.status}`);
    }
    
    const data = await res.json();
    
    // Attempt to extract the latest status
    const statusObj = data?.expeditionStatus || (data?.expeditionHistory && data.expeditionHistory.length > 0 ? data.expeditionHistory[0] : null);
    
    const statusText = statusObj?.statusLabel || statusObj?.status || statusObj?.name || data?.summary || data?.status || "Înregistrat";
    const statusTextLower = statusText?.toLowerCase() || '';
    const statusStateLower = (statusObj?.statusState || '')?.toLowerCase();
    
    const isFailed = Boolean(
      data?.expeditionSummary?.canceled || 
      statusTextLower.includes('returnat') || 
      statusTextLower.includes('refuzat') || 
      statusTextLower.includes('anulat') || 
      statusTextLower.includes('stornat') || 
      statusTextLower.includes('esuat') || 
      statusTextLower.includes('eșuat')
    );
    const hasNegativeDeliveryWord =
      statusTextLower.includes('nelivrat') ||
      statusTextLower.includes('undelivered') ||
      statusStateLower.includes('nelivrat') ||
      statusStateLower.includes('undelivered');
    const isDelivered = !isFailed && !hasNegativeDeliveryWord && Boolean(
      data?.expeditionSummary?.delivered === true ||
      statusTextLower.includes('livrat') || 
      statusTextLower.includes('delivered') ||
      statusStateLower.includes('livrat')
    );
    
    return {
      status: 'ok',
      statusCode: isDelivered ? 7 : (isFailed ? -1 : 1), 
      statusText: statusText || 'În tranzit',
      delivered: isDelivered,
      failed: isFailed,
      error: isFailed // Also pass as error so the frontend styles it red if it doesn't check 'failed'
    };
  } catch (err) {
    console.error("Sameday Status Check failed:", err);
    throw err;
  }
}

export async function getSamedayAwbPdf(awbNumber: string): Promise<ArrayBuffer> {
  const token = await getSamedayToken();
  const res = await fetch(`${API_URL}/api/awb/download/${awbNumber}`, {
    headers: {
      'X-Auth-Token': token!,
      'Accept': 'application/pdf'
    },
    cache: 'no-store'
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch Sameday PDF: ${res.status}`);
  }
  
  return await res.arrayBuffer();
}

export async function cancelSamedayAwb(awbNumber: string) {
  const token = await getSamedayToken();
  try {
    const res = await fetch(`${API_URL}/api/awb/${awbNumber}`, {
      method: 'DELETE',
      headers: {
        'X-Auth-Token': token!,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn(`Sameday AWB Cancel warning (${res.status}): ${errorText}`);
      // Usually 404 or 400 means it's already deleted or cannot be deleted.
      // We don't throw an error to prevent blocking the local reset.
      return false;
    }
    return true;
  } catch (err) {
    console.error("Sameday AWB Cancel failed:", err);
    return false; // Don't block local reset if API fails
  }
}
