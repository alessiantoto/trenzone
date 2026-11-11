import { NextResponse } from "next/server";
import { createPacketaParcel } from "@/lib/packeta-api";
import { isAdminAuthorized } from "@/app/actions/admin-auth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const isAuthorized = await isAdminAuthorized();
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      }, { status: 400 });
    }

    console.log(`📦 [PACKETA] Creating parcel for Order: ${orderId}`);
    console.log(`🚛 Delivery Tech Data: addressId=${addressId}, lockerId=${carrierPickupPoint || 'NONE'}`);

    const result = await createPacketaParcel({
      number: orderId,
      name: firstName,
      surname: lastName,
      email: email || "",
      phone: phone || "",
      addressId: String(addressId),
      carrierPickupPoint: carrierPickupPoint ? String(carrierPickupPoint) : undefined,
      value: Number(value) || 0,
      currency: currency || "RON",
      cod: Number(cod) || 0,
      country: country || "RO",
      street: street || "",
      houseNumber: houseNumber || "",
      city: city || "",
      zip: zip || ""
    });

    console.log(`✅ [PACKETA] Success! PacketId: ${result.packetId}`);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("EROARE CRITICĂ în Ruta Packeta:", error);
    return NextResponse.json({ 
      error: error.message || "S-a produs o eroare la comunicarea cu Packeta." 
    }, { status: 500 });
  }
}
