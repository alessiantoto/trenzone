"use client";

import { LegalContent } from "@/components/legal/LegalContent";
import { useLocale } from "next-intl";

export default function ReturnPolicyPage() {
  const locale = useLocale();
  const isEn = locale === "en";

  if (isEn) {
    return (
      <LegalContent 
        title="Return Policy" 
        lastUpdated="September 3, 2026"
      >
        <h2>1. Legal Right of Return</h2>
        <p>
          According to OUG 34/2014, individual customers (B2C) have the <strong>right to return</strong> products purchased online, without stating reasons, within 30 calendar days from the date of receipt of the product.
        </p>

        <h2>2. Conditions for Return</h2>
        <p>
          TrenZone® products are of premium quality. For the return to be accepted, the integrity of the product must be impeccable:
        </p>
        <ul>
          <li>Be in new, unused condition, without traces of wear or assembly.</li>
          <li>Have the original packaging complete and intact.</li>
          <li>Not have been washed, modified, or tested in training conditions.</li>
          <li>Be accompanied by all original accessories, labels, and documentation.</li>
        </ul>

        <h2>3. Products that CANNOT be returned</h2>
        <p>
          There are certain categories exempted from return according to legislation (OUG 34/2014, art. 16):
        </p>
        <ul>
          <li><strong>Sealed hygiene or protective goods that have been unsealed.</strong> According to legislation (OUG 34/2014 art. 16 lit. e), products unsealed after delivery that cannot be returned for health protection or hygiene reasons are strictly non-returnable.</li>
          <li>Clothing or accessories (e.g., wraps, sleeves) that show signs of wear, have been washed, or lack original tags.</li>
          <li>Products customized or modified at the express request of the customer.</li>
        </ul>

        <h2>4. Return Procedure</h2>
        <p>
          <strong>The customer initiates the return</strong> by completing our dedicated digital return form. This ensures a fast and transparent process where you can track the status of your request.
        </p>
        <p className="mt-4 mb-8">
          <a href="/en/retur" className="inline-block bg-[#e32f8c] hover:bg-black !text-white hover:!text-[#e32f8c] px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 !no-underline">
            Complete the Return Form
          </a>
        </p>
        <p>
          You will need your <strong>Order Number</strong> and the <strong>Email</strong> used during checkout to submit the form. Once submitted, our team will review the request and contact you with further instructions.
        </p>
        <p>
          <strong>Return Shipping Address (EU / Romania):</strong> To avoid prohibitive transcontinental shipping costs and customs formalities to the US, customer returns from Romania and Europe are directed to TrenZone's designated regional logistics hub in Romania. The exact warehouse address and RMA tracking number are provided directly in the email confirmation upon completing the return form at <a href="/en/retur" className="text-[#e32f8c] underline font-bold">/en/retur</a>. Please note that return parcels sent with cash-on-delivery (COD) fees attached cannot be accepted and will be automatically refused by the warehouse.
        </p>
        <p>
          The shipping cost for the return is borne entirely by the <strong>Customer</strong>, unless the return is due to a mistake on our part (e.g., wrong product shipped, manufacturing defect). In such exceptional cases, TrenZone® will fully cover the return shipping costs. In the case of international returns, the customer is also responsible for any customs duties or export taxes necessary for returning the product to our designated returns facility.
        </p>

        <h2>5. Diminution of Value & Reimbursement</h2>
        <p>
          According to the law, the consumer is responsible for the diminution of the value of the products resulting from handlings other than those necessary to determine the nature, characteristics, and functioning of the products.
        </p>
        <p>
          <strong>Diminished Value of Goods:</strong> In the case of eligible return products (e.g., apparel) that are returned without original tags, with damaged packaging, or showing minor signs of mishandling (not amounting to wear), TrenZone® reserves the right to withhold a <strong>value diminution fee</strong> (between 15% and 50% of the product price) to cover refurbishment costs. Note: Goods unsealed after delivery that cannot be returned for hygiene or health reasons are non-returnable.
        </p>
        <p>
          Reimbursement of the amount is processed within a maximum of <strong>14 calendar days</strong> from the physical receipt of the package at our facility and confirmation of its integrity (or calculation of value diminution, if applicable).
        </p>
        <p>
          <strong>Payment Method for Refunds:</strong>
        </p>
        <ul>
          <li><strong>Card Payments (Stripe):</strong> The refund is credited automatically back to the original card used during checkout.</li>
          <li><strong>Cash on Delivery (COD):</strong> For orders paid cash to the courier, the money refund will be made via <strong>Bank Transfer (IBAN)</strong>, to the account indicated by the customer in the return form, after the product successfully passes the technical inspection.</li>
        </ul>

        <h2>6. Exchanging Products (Size/Model)</h2>
        <p>
          If you wish to exchange a product for another size or another model, the procedure is identical to that of a return: the original product is returned according to the steps above, and the new order is placed separately on the site. This approach allows us to deliver the new products in the shortest possible time.
        </p>

        <h2>7. Final Mentions</h2>
        <ul>
          <li>The return policy applies exclusively to private individuals (B2C).</li>
          <li>Legal entities (B2B) can request a return only based on prior commercial agreements.</li>
          <li>In the case of products received with manufacturing defects, the return cost is borne entirely by TrenZone®.</li>
        </ul>
      </LegalContent>
    );
  }

  return (
    <LegalContent 
      title="Politică de Retur" 
      lastUpdated="3 septembrie 2026"
    >
      <h2>1. Dreptul legal de retur</h2>
      <p>
        Conform OUG 34/2014, clienții persoane fizice au <strong>dreptul de retur</strong> a produselor achiziționate online, fără a preciza motivele, în termen de 30 de zile calendaristice de la data recepției produsului.
      </p>

      <h2>2. Condiții pentru returnare</h2>
      <p>
        Produsele TrenZone® sunt de cea mai înaltă calitate. Pentru ca returul să fie acceptat, integritatea produsului trebuie să fie impecabilă:
      </p>
      <ul>
        <li>Să fie în stare nouă, nefolosită, fără urme de uzură sau montaj.</li>
        <li>Să aibă ambalajul original complet și intact.</li>
        <li>Să nu fi fost spălat, modificat sau testat în condiții de antrenament.</li>
        <li>Să fie însoțit de toate accesoriile, etichetele și documentația originală.</li>
      </ul>

      <h2>3. Produse care NU pot fi returnate</h2>
      <p>
        Există anumite categorii exceptate de la retur conform legislației (OUG 34/2014, art. 16):
      </p>
      <ul>
        <li><strong>Produse sigilate din motive de igienă sau protecție a sănătății care au fost desigilate după livrare.</strong> Conform OUG 34/2014 art. 16 lit. e, aceste produse nu pot fi returnate odată ce sigiliul de protecție a fost rupt.</li>
        <li>Articole de echipament sportiv sau accesorii (ex. benzi de cot, fașe, tricouri) care prezintă urme de purtare, au fost spălate, au miros de transpirație/parfum sau nu mai au etichetele și ambalajele originale atașate.</li>
        <li>Produse personalizate sau modificate la cererea expresă a clientului.</li>
      </ul>

      <h2>4. Procedura de retur</h2>
      <p>
        <strong>Clientul inițializează returul</strong> prin completarea formularului nostru digital dedicat. Acest lucru asigură un proces rapid și transparent, prin care poți urmări în timp real statusul solicitării.
      </p>
      <p className="mt-4 mb-8">
        <a href="/ro/retur" className="inline-block bg-[#e32f8c] hover:bg-black !text-white hover:!text-[#e32f8c] px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-xl active:scale-95 !no-underline">
          Completează Formularul de Retur
        </a>
      </p>
      <p>
        Vei avea nevoie de <strong>Numărul Comenzii</strong> și <strong>Adresa de Email</strong> folosite la plasarea comenzii. După trimitere, echipa noastră va analiza cererea și te va contacta cu instrucțiunile logistice necesare.
      </p>
      <p>
        <strong>Adresă Expediere Retur (România & UE):</strong> Pentru a evita costurile prohibitive de transport transcontinental și formalitățile vamale către SUA, retururile consumatorilor din România și Uniunea Europeană sunt direcționate către centrul logistic regional partener din România. Adresa exactă a hub-ului logistic și codul unic de retur sunt furnizate automat în confirmarea transmisă pe email după completarea formularului de la <a href="/ro/retur" className="text-[#e32f8c] underline font-bold">/ro/retur</a>. Vă rugăm să rețineți că expedierile de retur transmise cu plata ramburs (COD) către depozit vor fi refuzate automat conform procedurilor de recepție.
      </p>
      <p>
        Costul transportului pentru returnare este suportat integral de către <strong>Client</strong>, cu excepția cazului în care returul este cauzat de o greșeală din partea noastră (ex: produs greșit livrat, defect de fabricație). În aceste situații excepționale, TrenZone® va suporta integral costurile de transport. În cazul retururilor internaționale, clientul este responsabil de asemenea pentru orice taxe vamale sau de export necesare returnării produsului către adresa desemnată de retur a TrenZone.
      </p>

      <h2>5. Diminuarea Valorii & Rambursarea</h2>
      <p>
        Conform legii, consumatorul este responsabil pentru diminuarea valorii produselor care rezultă din manipulări altele decât cele necesare pentru determinarea naturii, caracteristicilor și funcționării produselor.
      </p>
      <p>
        <strong>Diminuarea Valorii:</strong> În cazul produselor eligibile pentru retur (ex: îmbrăcăminte) care sunt returnate fără etichetele originale, cu ambalajul deteriorat excesiv sau care prezintă semne de manipulare necorespunzătoare, TrenZone® își rezervă dreptul de a reține o <strong>taxă de diminuare a valorii</strong> (între 15% și 50% din prețul produsului) pentru a acoperi pierderea de valoare comercială. Atenție: Produsele desigilate neeligibile din motive de igienă nu intră sub incidența acestei clauze, fiind strict nereturnabile.
      </p>
      <p>
        Rambursarea sumei se procesează în maximum <strong>14 zile calendaristice</strong> de la recepția fizică a coletului la depozit și confirmarea integrității acestuia (sau calcularea diminuării de valoare, dacă este cazul).
      </p>
      <p>
        <strong>Modalitatea de restituire a banilor:</strong>
      </p>
      <ul>
        <li><strong>Plăți Online cu Cardul (Stripe):</strong> Banii sunt restituiți automat direct pe cardul bancar utilizat la efectuarea comenzii.</li>
        <li><strong>Plăți Ramburs (Numerar la Curier):</strong> În cazul comenzilor achitate numerar la curier, returnarea banilor se face prin <strong>Transfer Bancar (IBAN)</strong>, în contul indicat de client în formularul de retur, numai după ce produsul trece cu succes de inspecția tehnică.</li>
      </ul>

      <h2>6. Schimbarea produselor (Mărime/Model)</h2>
      <p>
        Dacă doriți schimbarea unui produs cu o altă mărime sau un alt model, procedura este identică cu cea de retur: produsul original se returnează conform pașilor de mai sus, iar noua comandă se plasează separat pe site. Această abordare ne permite să livrăm noile produse în cel mai scurt timp posibil.
      </p>

      <h2>7. Mențiuni Finale</h2>
      <ul>
        <li>Politica de retur se aplică exclusiv persoanelor fizice (B2C).</li>
        <li>Persoanele juridice (B2B) pot solicita retur doar în baza unor acorduri comerciale prealabile.</li>
        <li>În cazul produselor primite cu defecte de fabricație, costul returului este suportat integral de TrenZone®.</li>
      </ul>
    </LegalContent>
  );
}
