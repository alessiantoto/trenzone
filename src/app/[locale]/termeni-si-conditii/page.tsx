"use client";

import { LegalContent } from "@/components/legal/LegalContent";
import { useLocale } from "next-intl";

export default function TermsPage() {
  const locale = useLocale();
  const isEn = locale === "en";

  if (isEn) {
    return (
      <LegalContent 
        title="Terms and Conditions" 
        lastUpdated="September 3, 2026"
      >
        <h2>1. General Information</h2>
        <p>
          The website <strong>trenzone.fit</strong> is owned and operated by:
          <br /><br />
          <strong>TrenZone LLC</strong>
          <br />
          Entity Type: Limited Liability Company (Wyoming, USA)
          <br />
          Registration / Filing Number: GZ-US-WY-1790986605415
          <br />
          Principal Place of Business: 75 E 3RD ST, SHERIDAN, WY, 82801, USA
          <br />
          Mailing Address: 75 E 3RD ST, SHERIDAN, WY, 82801, USA
          <br />
          Registered Agent: WY Commercial Registered Agent LLC, 75 E 3RD ST, SHERIDAN, WY, 82801, USA
          <br />
          Customer Support Email: trenzone483@gmail.com
          <br />
          Regional Returns & Logistics Hub (Romania & EU): Dedicated partner fulfillment facility in Romania (return instructions and RMA tracking are provided upon submitting the return form at <a href="/en/retur" className="text-[#e32f8c] underline">/en/retur</a>).
        </p>
        <p>
          By browsing and using this website, you express your full agreement with the terms presented below.
        </p>

        <h2>2. Scope of Activity</h2>
        <p>
          We are an online strength and fitness brand offering: 
          <strong>Heavy-duty elbow wraps and professional powerlifting equipment</strong>.
        </p>

        <h2>3. Intellectual Property</h2>
        <p>
          All visual and textual material is the property of <strong>TrenZone LLC</strong>. 
          Unauthorized use of these, in any form, entails legal liability.
        </p>

        <h2>4. Products and Prices</h2>
        <ul>
          <li>Prices are displayed in the selected store currency (RON, EUR, USD, or GBP). Please note the seller is a non-VAT payer (VAT not applicable).</li>
          <li>For shipments outside the European Union Customs Union, listed product and shipping prices do not include destination import VAT/GST, customs duties, or local courier clearance fees.</li>
          <li>Prices may undergo strategic changes without notice, reflecting the quality of materials.</li>
          <li>We reserve the right to correct any technical display errors.</li>
          <li>Product offers are valid strictly within the limit of available stock.</li>
        </ul>

        <h2>5. Order Confirmation</h2>
        <p>
          The sales contract is considered concluded when TrenZone® sends the <strong>Shipping Confirmation</strong> email. The automatic email received immediately after placing the order represents only a confirmation of receipt of the purchase request and does not constitute firm acceptance of the order.
        </p>
        <p>
          We reserve the right to refuse or cancel orders in case of incomplete data, technical price errors, or suspicion of fraud.
        </p>

        <h2>6. Cancellation Policy</h2>
        <p>
          You can cancel an order within a maximum of 12 hours from placement, provided it has not already been shipped. To cancel, please contact us immediately via email. 
        </p>
        <p>
          If the package has already been shipped, cancellation is no longer possible, but you can refuse the package upon delivery.
        </p>

        <h2>7. Payment Methods</h2>
        <ul>
          <li>Cash on Delivery (Available in Romania)</li>
          <li>Secure Online Payment (Credit/Debit Card via Stripe)</li>
        </ul>

        <h2>8. Delivery & International Customs Notice</h2>
        <p>
          Physical shipments are dispatched from our logistics hub in Romania through international courier partners. Estimated delivery times:
        </p>
        <ul>
          <li><strong>Romania:</strong> 1–3 business days.</li>
          <li><strong>European Union & Europe:</strong> 3–8 business days.</li>
          <li><strong>Worldwide (USA, Canada, UK, Switzerland, Norway, Latin America, Middle East, Asia, Australia, New Zealand, South Africa):</strong> 7–17 business days, depending on destination and customs processing.</li>
        </ul>
        <p>
          <strong>Customs Duties, Import VAT/GST & Clearance Fees (Non-EU Destinations — DAP):</strong> All international physical orders outside the EU Customs Union (including the United Kingdom, Switzerland, Norway, Iceland, Turkey, Ukraine, USA, Canada, Mexico, South America, Israel, UAE, Asia, Australia, New Zealand, South Africa, as well as special tax/customs territories such as the Canary Islands) are shipped under <strong>DAP (Delivered At Place)</strong> terms. Any customs duties, local import VAT/GST, or courier clearance/brokerage fees imposed by destination authorities are the sole responsibility of the recipient upon delivery.
        </p>
        <p>
          TrenZone® has no control over these charges and cannot predict their exact amount. If a parcel is refused or left unclaimed due to unpaid customs or import charges, any return shipping fees, return customs fees, or carrier abandonment charges will be deducted from any eligible refund, and initial shipping costs are non-refundable.
        </p>

        <h2>9. Return Policy</h2>
        <p>
          Individual consumers (B2C) have the <strong>right to return</strong> products within 30 calendar days, according to OUG 34/2014. 
          For details on the technical inspection procedure for returns, consult the Return Policy.
        </p>

        <h2>10. Warranty and Product Conformity</h2>
        <p>
          Our products are engineered to the highest performance standards. We offer a 30-day commercial warranty against manufacturing defects (e.g. stitching, material flaws) for our elbow wraps, powerlifting accessories, and apparel. This commercial warranty does not affect your statutory consumer rights regarding conformity under applicable law (OUG 140/2021). The warranty does not cover normal wear and tear from heavy training, misuse, or failure to follow care instructions.
        </p>
        <p>
          For assistance or warranty claims, contact us directly at <strong>trenzone483@gmail.com</strong> with your order proof.
        </p>

        <h2>11. Limitation of Liability</h2>
        <p>
          TrenZone® is not liable for any direct, indirect, or accidental damages resulting from the use or inability to use our products or website.
        </p>

        <h2>12. Disputes and Alternative Dispute Resolution (ANPC / SAL / ODR)</h2>
        <p>
          Any dispute will be resolved amicably. Otherwise, jurisdiction belongs to the competent courts.
        </p>
        <p>
          Consumers have the right to appeal to statutory alternative dispute resolution mechanisms through:
        </p>
        <ul>
          <li><strong>ANPC</strong> (National Authority for Consumer Protection) – <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">www.anpc.ro</a></li>
          <li><strong>SAL</strong> (Alternative Dispute Resolution) – <a href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">reclamatiisal.anpc.ro</a></li>
          <li><strong>ODR Platform</strong> (European Commission Online Dispute Resolution) – <a href="https://consumer-redress.ec.europa.eu/index_en" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">consumer-redress.ec.europa.eu</a></li>
        </ul>

        <h2>13. Data Protection</h2>
        <p>
          Processing of personal data is carried out according to Regulation (EU) 2016/679 (GDPR). 
          For details on how we protect your data, consult the <strong>Privacy Policy</strong>.
        </p>

        <h2>14. Governing Law & Jurisdiction</h2>
        <p>
          This contract is governed by Romanian law. Any disputes arising from or in connection with the use of the site or the conclusion of the contract shall be settled by the competent courts in Romania.
        </p>

        <h2>15. Contact</h2>
        <p>
          The TrenZone® team is here to support your performance. For questions, complaints, or return assistance:
          <br /><br />
          Email: <strong>trenzone483@gmail.com</strong>
        </p>
      </LegalContent>
    );
  }

  return (
    <LegalContent 
      title="Termeni și Condiții" 
      lastUpdated="3 septembrie 2026"
    >
      <h2>1. Informații generale</h2>
      <p>
        Site‑ul <strong>trenzone.fit</strong> este deținut și operat de către:
        <br /><br />
        <strong>TrenZone LLC</strong>
        <br />
        Formă Juridică: Societate cu răspundere limitată constituită în Statul Wyoming, SUA (Limited Liability Company)
        <br />
        Număr de Înregistrare / Filing ID: GZ-US-WY-1790986605415
        <br />
        Sediu Principal de Afaceri: 75 E 3RD ST, SHERIDAN, WY, 82801, USA
        <br />
        Adresă Corespondență: 75 E 3RD ST, SHERIDAN, WY, 82801, USA
        <br />
        Agent Înregistrat: WY Commercial Registered Agent LLC, 75 E 3RD ST, SHERIDAN, WY, 82801, USA
        <br />
        Email Contact & Suport: trenzone483@gmail.com
        <br />
        Centru Logistic & Punct de Recepție Retururi (România & UE): Hub logistic partener desemnat în România (adresa exactă și instrucțiunile de expediere sunt furnizate automat la completarea formularului de retur la <a href="/ro/retur" className="text-[#e32f8c] underline">/ro/retur</a>).
      </p>
      <p>
        Prin navigarea și utilizarea acestui site, vă exprimați acordul deplin față de termenii prezentați mai jos.
      </p>

      <h2>2. Domeniul de activitate</h2>
      <p>
        Suntem un brand dedicat sporturilor de forță și powerlifting-ului, oferind: 
        <strong>Echipamente profesionale de forță, benzi de cot heavy-duty și accesorii de performanță</strong>.
      </p>

      <h2>3. Proprietate intelectuală</h2>
      <p>
        Toate drepturile de proprietate intelectuală asupra site-ului nostru și conținutului acestuia sunt deținute de <strong>TrenZone LLC</strong>. 
        Utilizarea neautorizată a acestora, sub orice formă, atrage după sine răspunderea conform legii.
      </p>

      <h2>4. Produse și prețuri</h2>
      <ul>
        <li>Prețurile sunt afișate în moneda selectată pe site (RON, EUR, USD sau GBP). Menționăm că vânzătorul este neplătitor de TVA (TVA neaplicabil).</li>
        <li>Pentru comenzile expediate în afara Uniunii Vamale Europene, prețurile afișate și tariful de transport nu includ taxele vamale, TVA/GST local de import sau comisioanele de vămuire din țara de destinație.</li>
        <li>Prețurile pot suferi modificări strategice fără notificare, reflectând calitatea materialelor.</li>
        <li>Ne rezervăm dreptul de a corecta eventualele erori tehnice de afișare.</li>
        <li>Oferta produselor este valabilă strict în limita stocului disponibil.</li>
      </ul>

      <h2>5. Confirmarea Comenzii</h2>
      <p>
        Contractul de vânzare se consideră încheiat în momentul în care TrenZone® transmite e-mailul de <strong>Confirmare Expediție</strong>. E-mailul automat primit imediat după plasarea comenzii reprezintă doar o confirmare de recepție a solicitării de cumpărare și nu constituie acceptarea fermă a comenzii.
      </p>
      <p>
        Ne rezervăm dreptul de a refuza sau anula comenzi în caz de date incomplete, erori tehnice de preț sau suspiciuni de fraudă.
      </p>

      <h2>6. Politica de anulare</h2>
      <p>
        Poți anula o comandă în maximum 12 ore de la plasare, dacă aceasta nu a fost deja expediată. Pentru anulare, contactează-ne imediat pe email.
      </p>
      <p>
        Dacă pachetul a fost trimis, anularea nu mai este posibilă, dar poți refuza coletul la livrare.
      </p>

      <h2>7. Modalități de plată</h2>
      <ul>
        <li>Plata Ramburs (Numerar la Livrare către curier - disponibil doar în RO)</li>
        <li>Plata Online Securizată (Card Bancar prin Stripe)</li>
      </ul>

      <h2>8. Livrarea Produselor & Taxe Vamale Internaționale</h2>
      <p>
        Coletele fizice sunt expediate din hub-ul nostru logistic din România prin parteneri de curierat internațional. Termenul estimat de livrare este de:
      </p>
      <ul>
        <li><strong>România:</strong> 1–3 zile lucrătoare.</li>
        <li><strong>Uniunea Europeană & Europa:</strong> 3–8 zile lucrătoare.</li>
        <li><strong>Internațional (SUA, Canada, Marea Britanie, Elveția, Norvegia, America Latină, Orientul Mijlociu, Asia, Australia, Noua Zeelandă, Africa de Sud):</strong> 7–17 zile lucrătoare, în funcție de destinație și procedurile vamale locale.</li>
      </ul>
      <p>
        <strong>Notă privind taxele vamale și de import (Livrări Non-UE — regim DAP):</strong> Comenzile livrate în țări sau teritorii din afara Uniunii Vamale a Uniunii Europene (inclusiv Marea Britanie, Elveția, Norvegia, Islanda, Turcia, Ucraina, SUA, Canada, Mexic, America de Sud, Israel, Emiratele Arabe Unite, Asia, Australia, Noua Zeelandă, Africa de Sud, precum și teritorii cu regim vamal/TVA special precum Insulele Canare) sunt expediate în regim <strong>DAP (Delivered At Place)</strong>. Eventualele taxe vamale, TVA/GST de import local și comisioane de vămuire/brokeraj percepute de autoritățile sau curierii din țara de destinație sunt exclusiv în sarcina destinatarului la momentul livrării.
      </p>
      <p>
        TrenZone® nu controlează și nu poate estima exact cuantumul acestor taxe locale. În cazul în care coletul este refuzat sau neridicat din cauza neachitării taxelor vamale/de import, costurile de retur internațional, eventualele taxe vamale de retur sau distrugere percepute de curier se deduc din suma rambursabilă, iar taxa inițială de transport nu este rambursabilă.
      </p>
      <p>
        Toate detaliile logistice specifice sunt afișate transparent în Sumar-ul de Comandă înainte de plată.
      </p>

      <h2>9. Politica de Retur</h2>
      <p>
        Consumatorul persoană fizică are <strong>dreptul de retur</strong> în 30 de zile calendaristice, conform OUG 34/2014. 
        Pentru detalii despre procedura de inspecție tehnică a returului, consultați Politica de Retur.
      </p>

      <h2>10. Garanția și Conformitatea Produselor</h2>
      <p>
        Produsele noastre sunt proiectate conform celor mai înalte standarde de anduranță. Oferim o garanție comercială de 30 de zile pentru defecte de fabricație (cusături, vicii de material) pentru benzile de cot, accesoriile de powerlifting și îmbrăcăminte. Această garanție comercială nu afectează drepturile legale conferite consumatorilor prin garanția legală de conformitate reglementată de OUG nr. 140/2021. Garanția nu acoperă uzura normală rezultată din antrenamentele grele, utilizarea necorespunzătoare sau nerespectarea instrucțiunilor de întreținere.
      </p>
      <p>
        Pentru asistență și cereri de garanție, folosiți canalul oficial de email <strong>trenzone483@gmail.com</strong>, prezentând dovada achiziției.
      </p>

      <h2>11. Limitarea răspunderii</h2>
      <p>
        În măsura maximă permisă de lege, TrenZone® nu va fi răspunzător pentru niciun fel de daune directe, indirecte, accidentale sau de orice altă natură care rezultă din utilizarea sau incapacitatea de a utiliza site-ul sau produsele noastre.
      </p>

      <h2>12. Litigii și Soluționare Alternativă (ANPC / SAL / SOL)</h2>
      <p>
        Orice conflict va fi soluționat pe cale amiabilă. În caz contrar, competența revine instanțelor judecătorești competente.
      </p>
      <p>
        Consumatorii au dreptul de a apela la mecanismele legale de soluționare alternativă a litigiilor prin:
      </p>
      <ul>
        <li><strong>ANPC</strong> (Autoritatea Națională pentru Protecția Consumatorilor) – <a href="https://anpc.ro" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">www.anpc.ro</a></li>
        <li><strong>SAL</strong> (Soluționarea Alternativă a Litigiilor) – <a href="https://reclamatiisal.anpc.ro/" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">reclamatiisal.anpc.ro</a></li>
        <li><strong>Platforma SOL</strong> (Soluționarea Online a Litigiilor a Comisiei Europene) – <a href="https://consumer-redress.ec.europa.eu/index_ro" target="_blank" rel="noopener noreferrer" className="text-[#e32f8c] underline font-bold">consumer-redress.ec.europa.eu</a></li>
      </ul>

      <h2>13. Protecția Datelor</h2>
      <p>
        Prelucrarea datelor cu caracter personal se realizează conform Regulamentului (UE) 2016/679 (GDPR). 
        Pentru detalii despre modul în care protejăm datele dumneavoastră, consultați <strong>Politica de Confidențialitate</strong>.
      </p>

      <h2>14. Legea Aplicabilă și Jurisdicția</h2>
      <p>
        Prezentul contract este guvernat de legea română. Orice litigiu rezultat din sau în legătură cu utilizarea site-ului sau încheierea contractului va fi soluționat de instanțele judecătorești competente din România.
      </p>

      <h2>15. Contact</h2>
      <p>
        Echipa TrenZone® este aici pentru tine. Pentru întrebări, reclamații sau asistență:
        <br /><br />
        Email: <strong>trenzone483@gmail.com</strong>
      </p>
    </LegalContent>
  );
}
