import { NextResponse } from "next/server";
import { createPacketaParcel } from "@/lib/packeta-api";
import { isAdminAuthorized } from "@/app/actions/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const noStoreHeaders = { 'Cache-Control': 'private, no-store, max-age=0' };
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: noStoreHeaders });
    }

    const body = await req.json().catch(() => ({}));
    
    const { 
      orderId, firstName, lastName, email, phone, 
      addressId, carrierPickupPoint, value, currency, 
      cod, country, street, houseNumber, city, zip 
    } = body;

    if (!orderId || !firstName || !lastName || !addressId) {
      return NextResponse.json({ 
        error: "Date lipsă pentru crearea coletului (ID Ordine, nume sau punct livrare)." 
      }, { status: 400, headers: noStoreHeaders });
    }

    console.log(`[PACKETA] Creating parcel for Order: ${String(orderId).slice(0, 64)}`);
    console.log(`Delivery Tech Data: addressId=${String(addressId).slice(0, 32)}, lockerId=${carrierPickupPoint ? String(carrierPickupPoint).slice(0, 32) : 'NONE'}`);

    const result = await createPacketaParcel({
      number: String(orderId).slice(0, 64),
      name: String(firstName).slice(0, 100),
      surname: String(lastName).slice(0, 100),
      email: String(email || "").slice(0, 150),
      phone: String(phone || "").slice(0, 32),
      addressId: String(addressId).slice(0, 32),
      carrierPickupPoint: carrierPickupPoint ? String(carrierPickupPoint).slice(0, 64) : undefined,
      value: Number(value) || 0,
      currency: String(currency || "RON").slice(0, 8),
      cod: Number(cod) || 0,
      country: String(country || "RO").slice(0, 8),
      street: String(street || "").slice(0, 200),
      houseNumber: String(houseNumber || "").slice(0, 32),
      city: String(city || "").slice(0, 100),
      zip: String(zip || "").slice(0, 20)
    });

    console.log(`[PACKETA] Success! PacketId: ${result.packetId}`);
    return NextResponse.json(result, { headers: noStoreHeaders });
  } catch (error: any) {
    console.error("EROARE CRITICĂ în Ruta Packeta:", error);
    return NextResponse.json({ 
      error: error.message || "S-a produs o eroare la comunicarea cu Packeta." 
    }, { status: 500, headers: noStoreHeaders });
  }
}
