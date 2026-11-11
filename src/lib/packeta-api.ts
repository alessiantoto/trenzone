import { FALLBACK_RATES, convertToRon, getServerExchangeRates } from '@/utils/pricing';

/**
 * Packeta API Utility for creating parcels (packets)
 * Documentation: https://docs.packeta.com
 * NOTE: Packeta REST API uses XML format over HTTP POST.
 */

const PACKETA_XML_URL = "https://www.zasilkovna.cz/api/rest";

export interface CreatePacketParams {
  number: string; // Order ID
  name: string;
  surname: string;
  email: string;
  phone: string;
  addressId: string; // PUDO point ID or Carrier ID
  carrierPickupPoint?: string; // Locker ID
  value: number;
  currency: string;
  cod?: number;
  country: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  zip?: string;
  weight?: number; // In KG
  width?: number;  // In mm
  height?: number; // In mm
  length?: number; // In mm
}

/**
 * Escapes special XML characters
 */
function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function createPacketaParcel(params: CreatePacketParams) {
  const apiPassword = process.env.PACKETA_API_PASSWORD;
  
  if (!apiPassword) {
    throw new Error("Missing PACKETA_API_PASSWORD environment variable");
  }

  // Normalize Phone Number (dialing code is REQUIRED by Packeta)
  let normalizedPhone = (params.phone || "").trim().replace(/[^0-9+]/g, "");
  
  // Make sure we have actual digits, not just the dialing code
  if (!normalizedPhone || normalizedPhone === "+" || normalizedPhone === "+40") {
    // Phone is empty or incomplete, skip it for Packeta
    normalizedPhone = "";
  } else {
    if (!normalizedPhone.startsWith("+")) {
      if (params.country === "RO") {
        if (normalizedPhone.startsWith("0")) normalizedPhone = "+40" + normalizedPhone.substring(1);
        else if (normalizedPhone.startsWith("40")) normalizedPhone = "+" + normalizedPhone;
        else normalizedPhone = "+40" + normalizedPhone;
      } else {
        normalizedPhone = "+" + normalizedPhone;
      }
    }
  }

  let finalValue = params.value;
  let finalCod = params.cod || 0;
  let finalCurrency = (params.currency || "RON").toUpperCase();

  // ALWAYS convert to RON for Packeta parcels
  // This avoids "Invalid currency" errors (USD/GBP) and ensures consistency for insurance & COD
  if (finalCurrency !== "RON") {
    const liveRates = await getServerExchangeRates();
    finalValue = Math.round(convertToRon(finalValue, finalCurrency, liveRates));
    finalCod = Math.round(convertToRon(finalCod, finalCurrency, liveRates));
    finalCurrency = "RON";
    console.log(`💱 [PACKETA] Auto-converting ${params.currency} to RON: Val ${params.value} -> ${finalValue}, COD ${params.cod} -> ${finalCod}`);
  }

  // STRICTOR PHONE CHECK: Romanian couriers (Sameday/Fan) REQUIRE a phone number.
  // If we don't have one, we MUST provide a fallback or the API will reject the packet.
  let safePhone = normalizedPhone;
  if (!safePhone && params.country === "RO") {
     safePhone = "+40700000000"; // Dummy fallback to avoid total API rejection
  }

  // Determine Sender (eshop) name
  let finalEshop = 'TrenZone';

  // Build the XML manually
  // Packeta API uses MILLIMETERS (mm) for dimensions. 200mm = 20cm.
  // CRITICAL: We include address tags even if carrierPickupPoint is present,
  // as some RO carriers use them as a fallback or verification.
  const xmlBody = `
<createPacket>
  <apiPassword>${escapeXml(apiPassword)}</apiPassword>
  <packetAttributes>
    <number>${escapeXml(params.number)}</number>
    <name>${escapeXml(params.name)}</name>
    <surname>${escapeXml(params.surname)}</surname>
    <email>${escapeXml(params.email)}</email>
    ${safePhone ? `<phone>${escapeXml(safePhone)}</phone>` : ''}
    <addressId>${escapeXml(params.addressId)}</addressId>
    ${(params.carrierPickupPoint && params.carrierPickupPoint.trim() !== "") 
      ? `<carrierPickupPoint>${escapeXml(params.carrierPickupPoint)}</carrierPickupPoint>` 
      : ''}
    <value>${finalValue}</value>
    <currency>${escapeXml(finalCurrency)}</currency>
    <cod>${finalCod}</cod>
    <eshop>${escapeXml(finalEshop)}</eshop>
    <weight>${params.weight || 0.25}</weight>
    <size>
      <width>${params.width || 200}</width>
      <height>${params.height || 100}</height>
      <length>${params.length || 200}</length>
    </size>
    <street>${escapeXml(params.street || "")}</street>
    <houseNumber>${escapeXml(params.houseNumber || "")}</houseNumber>
    <city>${escapeXml(params.city || "")}</city>
    <zip>${escapeXml(params.zip || "")}</zip>
  </packetAttributes>
</createPacket>`.trim();

  try {
    console.log(`📦 [PACKETA] Sending XML request (${new Date().toISOString()})`);
    console.log(`📦 [PACKETA] XML Body:`, xmlBody.substring(0, 500));

    const response = await fetch(PACKETA_XML_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xmlBody,
    });

    const responseText = await response.text();
    console.log(`📦 [PACKETA] Response received (${new Date().toISOString()}):`);
    console.log("Packeta XML Response:", responseText);

    // Simple check for error in XML response
    if (responseText.includes('<status>fault</status>')) {
      console.error('❌ [PACKETA API] FAULT RESPONSE:', responseText);
      const faultMatch = responseText.match(/<string>([\s\S]*?)<\/string>/) || responseText.match(/<faultString>([\s\S]*?)<\/faultString>/);
      const detailMatch = responseText.match(/<detail>([\s\S]*?)<\/detail>/);
      const faultString = faultMatch ? faultMatch[1] : "Eroare validare Packeta";
      const detailString = detailMatch ? ` (Detalii: ${detailMatch[1].replace(/<[^>]*>?/gm, ' ')})` : "";
      throw new Error(faultString + detailString);
    }

    if (!response.ok) {
      throw new Error(`Packeta API returned error status ${response.status}`);
    }

    // Extract basic info from XML (packet id)
    const idMatch = responseText.match(/<id>(\d+)<\/id>/);
    const barcodeMatch = responseText.match(/<barcode>([\s\S]*?)<\/barcode>/);

    return {
      status: 'ok',
      packetId: idMatch ? idMatch[1] : null,
      barcode: barcodeMatch ? barcodeMatch[1] : null,
      raw: responseText
    };
  } catch (error: any) {
    console.error("Packeta XML Communication failed:", error);
    throw error;
  }
}

/**
 * Retrieves the latest state of a packet from Packeta
 */
export async function getPacketStatus(packetId: string) {
  const apiPassword = process.env.PACKETA_API_PASSWORD;
  
  if (!apiPassword) {
    throw new Error("Missing PACKETA_API_PASSWORD environment variable");
  }

  const xmlBody = `
<packetStatus>
    <apiPassword>${escapeXml(apiPassword)}</apiPassword>
    <packetId>${escapeXml(packetId)}</packetId>
</packetStatus>`.trim();

  try {
    const response = await fetch(PACKETA_XML_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xmlBody,
    });

    const responseText = await response.text();

    if (responseText.includes('<status>fault</status>')) {
      const faultMatch = responseText.match(/<string>([\s\S]*?)<\/string>/) || responseText.match(/<faultString>([\s\S]*?)<\/faultString>/);
      throw new Error(faultMatch ? faultMatch[1] : "Eroare status Packeta");
    }

    // Extract status info
    const statusCodeMatch = responseText.match(/<statusCode>(\d+)<\/statusCode>/);
    const codeTextMatch = responseText.match(/<codeText>([\s\S]*?)<\/codeText>/);
    const statusTextMatch = responseText.match(/<statusText>([\s\S]*?)<\/statusText>/);

    const code = statusCodeMatch ? parseInt(statusCodeMatch[1]) : null;
    const isDelivered = code === 7;
    // Packeta status codes:
    // 1 = data received, 2 = parcel received, 3 = ready to ship, 4 = in transit, 5 = ready for pickup
    // 6 = handed to carrier (external courier in destination country - IN TRANSIT, NOT FAILED!)
    // 7 = delivered
    // 9 = returned to sender, 21 = returning to sender, 22 = returned
    const statusTextLower = statusTextMatch ? statusTextMatch[1].toLowerCase() : '';
    const isFailedCode = code === 9 || code === 21 || code === 22;
    const isFailedText = (statusTextLower.includes('return') || statusTextLower.includes('storno') || statusTextLower.includes('refuz') || statusTextLower.includes('anulat') || (statusTextLower.includes('cancel') && code !== 6 && !statusTextLower.includes('carrier')));
    const isFailed = isFailedCode || isFailedText;

    return {
      status: 'ok',
      statusCode: code,
      codeText: codeTextMatch ? codeTextMatch[1] : null,
      statusText: statusTextMatch ? statusTextMatch[1] : null,
      delivered: isDelivered,
      failed: isFailed,
      error: isFailed, // Ensure frontend renders red badge for cancelled/failed
      raw: responseText
    };
  } catch (error: any) {
    if (packetId !== "0") {
      console.error("Packeta Status Check failed:", error);
    }
    throw error;
  }
}

/**
 * Cancels a packet in Packeta
 */
export async function cancelPacketaParcel(packetId: string) {
  const apiPassword = process.env.PACKETA_API_PASSWORD;
  
  if (!apiPassword) {
    throw new Error("Missing PACKETA_API_PASSWORD environment variable");
  }

  const xmlBody = `
<packetCancel>
    <apiPassword>${escapeXml(apiPassword)}</apiPassword>
    <packetId>${escapeXml(packetId)}</packetId>
</packetCancel>`.trim();

  try {
    const response = await fetch(PACKETA_XML_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xmlBody,
    });

    const responseText = await response.text();

    if (responseText.includes('<status>fault</status>')) {
      const faultMatch = responseText.match(/<string>([\s\S]*?)<\/string>/) || responseText.match(/<faultString>([\s\S]*?)<\/faultString>/);
      console.warn("Packeta Cancel warning:", faultMatch ? faultMatch[1] : "Eroare anulare Packeta");
      return false; // Don't block local reset
    }

    return true;
  } catch (error: any) {
    console.error("Packeta Cancel failed:", error);
    return false; // Don't block local reset
  }
}

/**
 * Retrieves the AWB PDF from Packeta
 */
export async function getPacketaAwbPdf(packetId: string): Promise<Buffer> {
  const apiPassword = process.env.PACKETA_API_PASSWORD;
  
  if (!apiPassword) {
    throw new Error("Missing PACKETA_API_PASSWORD environment variable");
  }

  const cleanId = packetId.trim();
  const numericId = cleanId.replace(/^Z/i, '');

  // Try standard Packeta label PDF with format (A6 on A4 is standard for printing)
  // We test cleanId (e.g. Z2647880009) and numericId (2647880009)
  const idCandidates = [cleanId];
  if (numericId !== cleanId) {
    idCandidates.push(numericId);
  }

  let lastFault = "Eroare necunoscută la generarea AWB-ului Packeta";

  for (const id of idCandidates) {
    // 1. Try standard packetLabelPdf with A6 on A4
    const xmlBodyLabel = `
<packetLabelPdf>
    <apiPassword>${escapeXml(apiPassword)}</apiPassword>
    <packetId>${escapeXml(id)}</packetId>
    <format>A6 on A4</format>
    <offset>0</offset>
</packetLabelPdf>`.trim();

    try {
      const response = await fetch(PACKETA_XML_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xmlBodyLabel,
      });
      const responseText = await response.text();

      if (!responseText.includes('<status>fault</status>')) {
        const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/) || responseText.match(/<pdf>([\s\S]*?)<\/pdf>/);
        if (resultMatch) {
          return Buffer.from(resultMatch[1].trim(), 'base64');
        }
      } else {
        const faultMatch = responseText.match(/<string>([\s\S]*?)<\/string>/) || responseText.match(/<faultString>([\s\S]*?)<\/faultString>/);
        if (faultMatch) lastFault = faultMatch[1];
      }
    } catch (err: any) {
      console.warn(`Packeta packetLabelPdf A6 on A4 failed for ID ${id}:`, err.message);
    }

    // 2. Try packetLabelPdf with A6 on A6 (thermal printer format)
    const xmlBodyThermal = `
<packetLabelPdf>
    <apiPassword>${escapeXml(apiPassword)}</apiPassword>
    <packetId>${escapeXml(id)}</packetId>
    <format>A6 on A6</format>
    <offset>0</offset>
</packetLabelPdf>`.trim();

    try {
      const response = await fetch(PACKETA_XML_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xmlBodyThermal,
      });
      const responseText = await response.text();

      if (!responseText.includes('<status>fault</status>')) {
        const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/) || responseText.match(/<pdf>([\s\S]*?)<\/pdf>/);
        if (resultMatch) {
          return Buffer.from(resultMatch[1].trim(), 'base64');
        }
      }
    } catch (err: any) {
      console.warn(`Packeta packetLabelPdf A6 on A6 failed for ID ${id}:`, err.message);
    }

    // 3. Fallback to packetCourierLabelPdf if external courier
    const xmlBodyCourier = `
<packetCourierLabelPdf>
    <apiPassword>${escapeXml(apiPassword)}</apiPassword>
    <packetId>${escapeXml(id)}</packetId>
</packetCourierLabelPdf>`.trim();

    try {
      const response = await fetch(PACKETA_XML_URL, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: xmlBodyCourier,
      });
      const responseText = await response.text();

      if (!responseText.includes('<status>fault</status>')) {
        const resultMatch = responseText.match(/<result>([\s\S]*?)<\/result>/) || responseText.match(/<pdf>([\s\S]*?)<\/pdf>/);
        if (resultMatch) {
          return Buffer.from(resultMatch[1].trim(), 'base64');
        }
      }
    } catch (err: any) {
      console.warn(`Packeta packetCourierLabelPdf failed for ID ${id}:`, err.message);
    }
  }

  throw new Error(`Eroare la obținerea PDF-ului Packeta: ${lastFault}`);
}
