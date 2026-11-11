"use client";

import { LegalContent } from "@/components/legal/LegalContent";
import { useLocale } from "next-intl";

export default function PrivacyPolicyPage() {
  const locale = useLocale();
  const isEn = locale === "en";

  if (isEn) {
    return (
      <LegalContent 
        title="Privacy Policy" 
        lastUpdated="September 3, 2026"
      >
        <h2>1. General Information</h2>
        <p>
          This Privacy Policy describes how <strong>trenzone.fit</strong> collects, uses, and protects personal data, in accordance with applicable US data privacy regulations and Regulation (EU) 2016/679 (GDPR).
        </p>
        <p>
          By using this site, you agree to the practices described in this policy, ensuring a maximum level of transparency and security.
        </p>

        <h2>2. Data Controller</h2>
        <p>
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
          Email for Privacy / DPO: trenzone483@gmail.com
        </p>

        <h2>3. Data We Collect</h2>
        <ul>
          <li>First and last name</li>
          <li>Email address and phone number</li>
          <li>Shipping address and billing address</li>
          <li>IP address and device identifiers</li>
          <li>Messages sent through contact forms or support</li>
          <li>Information about browsing behavior (via cookies)</li>
        </ul>

        <h2>4. How We Collect Data</h2>
        <ul>
          <li>Placing an order on the site</li>
          <li>Contact form or assistance request</li>
          <li>Subscribing to TrenZone notifications</li>
          <li>Via cookies and similar technologies (e.g., Google Analytics)</li>
        </ul>

        <h2>5. Purposes of Data Processing</h2>
        <ul>
          <li><strong>Processing, billing, and shipping orders</strong> placed by users</li>
          <li>Responding to requests for technical support or commercial information</li>
          <li>Sending newsletters and marketing communications (only with consent)</li>
          <li>Statistical analysis to optimize the checkout flow</li>
          <li>Compliance with legal, fiscal, and archiving obligations</li>
        </ul>

        <h2>6. Legal Basis for Processing</h2>
        <ul>
          <li>Execution of the contract/order (Art. 6 para. 1 letter b)</li>
          <li>Consent (Art. 6 para. 1 letter a) for marketing</li>
          <li>Legitimate interest (Art. 6 para. 1 letter f) for security and analysis</li>
          <li>Legal obligations (Art. 6 para. 1 letter c) for billing</li>
        </ul>

        <h2>7. Who We Share Data With</h2>
        <p>
          To ensure an Elite level experience, we collaborate with trusted partners, to whom we transmit only the minimum necessary data:
        </p>
        <ul>
          <li><strong>Payment Processors:</strong> Stripe (for secure transactions)</li>
          <li><strong>Courier Services:</strong> Packeta (main partner through whom we facilitate local and international deliveries via carriers such as Sameday, FAN Courier, and other regional operators)</li>
          <li><strong>Cloud & Email Services:</strong> Resend, Vercel, Supabase (for infrastructure)</li>
          <li><strong>Analytics:</strong> Google Analytics (for site optimization)</li>
          <li>Public authorities, exclusively on the basis of strict legal obligations</li>
        </ul>

        <h2>8. Data Storage Duration</h2>
        <ul>
          <li><strong>Billing and commercial transaction records:</strong> Up to 7–10 years (in accordance with statutory commercial record retention obligations)</li>
          <li><strong>Contact forms:</strong> up to 24 months for support traceability</li>
          <li><strong>Newsletter:</strong> until consent is withdrawn (unsubscribing)</li>
          <li><strong>Traffic data:</strong> according to standard Google Analytics terms</li>
        </ul>

        <h2>9. Your Rights</h2>
        <p>
          In accordance with the GDPR Regulation, you benefit from full rights over your data:
        </p>
        <ul>
          <li>Right of access, rectification, and erasure of personal data</li>
          <li>Right to restriction of processing and the right to object</li>
          <li>Right to data portability</li>
          <li>Right to lodge a complaint with the supervisory authority (ANSPDCP)</li>
        </ul>
        <p>
          To exercise any of these rights, you can contact us at any time at: <strong>trenzone483@gmail.com</strong>.
        </p>

        <h2>10. Data Security</h2>
        <p>
          We implement state-of-the-art technical and organizational measures to protect data against unauthorized access. All sensitive data is transmitted via 256-bit SSL secured connections.
        </p>

        <h2>11. Cookie Policy</h2>
        <p>
          The site uses cookies to improve the user experience. For full details, we invite you to consult our <strong>Cookie Policy</strong>.
        </p>

        <h2>12. Policy Changes</h2>
        <p>
          We reserve the right to modify this Privacy Policy. Any updated version will be published transparently on this page.
        </p>
      </LegalContent>
    );
  }

  return (
    <LegalContent 
      title="Politică de Confidențialitate" 
      lastUpdated="3 septembrie 2026"
    >
      <h2>1. Informații generale</h2>
      <p>
        Această Politică de Confidențialitate descrie modul în care <strong>trenzone.fit</strong> colectează, utilizează și protejează datele cu caracter personal ale utilizatorilor site‑ului, în conformitate cu legislația aplicabilă și Regulamentul (UE) 2016/679 (GDPR).
      </p>
      <p>
        Prin utilizarea acestui site, vă exprimați acordul față de practicile descrise în această politică, asigurându-vă un nivel maxim de transparență și securitate.
      </p>

      <h2>2. Operatorul de date</h2>
      <p>
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
        Email Contact & DPO: trenzone483@gmail.com
      </p>

      <h2>3. Ce date colectăm</h2>
      <ul>
        <li>Nume și prenume</li>
        <li>Adresă de email și număr de telefon</li>
        <li>Adresă de livrare și adresă de facturare</li>
        <li>Adresă IP și identificatori de dispozitiv</li>
        <li>Mesaje transmise prin formulare de contact sau suport</li>
        <li>Informații despre comportamentul de navigare (prin cookie‑uri)</li>
      </ul>

      <h2>4. Cum colectăm datele</h2>
      <ul>
        <li>Plasarea unei comenzi pe site</li>
        <li>Formularul de contact sau de solicitare asistență</li>
        <li>Abonarea la notificările TrenZone</li>
        <li>Prin cookie‑uri și tehnologii similare (ex: Google Analytics)</li>
      </ul>

      <h2>5. Scopurile prelucrării datelor</h2>
      <ul>
        <li><strong>Procesarea, facturarea și expedierea comenzilor</strong> depuse de utilizatori</li>
        <li>Răspuns la solicitările de suport tehnic sau informații comerciale</li>
        <li>Trimiterea de newslettere și comunicări de marketing (doar cu consimțământ)</li>
        <li>Analiză statistică pentru optimizarea fluxului de checkout</li>
        <li>Respectarea obligațiilor legale, fiscale și de arhivare</li>
      </ul>

      <h2>6. Temeiul legal al prelucrării</h2>
      <ul>
        <li>Executarea contractului/comenzii (art. 6 alin. 1 lit. b)</li>
        <li>Consimțământ (art. 6 alin. 1 lit. a) pentru marketing</li>
        <li>Interesul legitim (art. 6 alin. 1 lit. f) pentru securitate și analiză</li>
        <li>Obligații legale (art. 6 alin. 1 lit. c) pentru facturare</li>
      </ul>

      <h2>7. Cu cine partajăm datele</h2>
      <p>
        Pentru a asigura o experiență de nivel Elite, colaborăm cu parteneri de încredere, cărora le transmitem doar datele minim necesare:
      </p>
      <ul>
        <li><strong>Procesatori de plăți:</strong> Stripe (pentru tranzacții securizate)</li>
        <li><strong>Servicii de curierat:</strong> Packeta (partener principal prin care facilităm livrările locale și internaționale prin transportatori precum Sameday, FAN Courier și alți operatori regionali)</li>
        <li><strong>Servicii Cloud & Email:</strong> Resend, Vercel, Supabase (pentru infrastructură)</li>
        <li><strong>Analiză:</strong> Google Analytics (pentru optimizarea site-ului)</li>
        <li>Autorități publice, exclusiv în baza unor obligații legale stricte</li>
      </ul>

      <h2>8. Durata stocării datelor</h2>
      <ul>
        <li><strong>Date de facturare și evidențe comerciale:</strong> până la 7–10 ani (conform obligațiilor statutare de păstrare a documentelor contabile și comerciale)</li>
        <li><strong>Formulare contact:</strong> până la 24 luni pentru trasabilitatea suportului</li>
        <li><strong>Newsletter:</strong> până la retragerea consimțământului (dezabonare)</li>
        <li><strong>Date trafic:</strong> conform termenelor standard Google Analytics</li>
      </ul>

      <h2>9. Drepturile dumneavoastră</h2>
      <p>
        În conformitate cu Regulamentul GDPR, beneficiați de drepturi depline asupra datelor dvs.:
      </p>
      <ul>
        <li>Dreptul de acces, rectificare și ștergere a datelor personale</li>
        <li>Dreptul de restricționare a prelucrării și dreptul de opoziție</li>
        <li>Dreptul la portabilitatea datelor</li>
        <li>Dreptul de a depune plângere la autoritatea de supraveghere (ANSPDCP)</li>
      </ul>
      <p>
        Pentru exercitarea oricăruia dintre aceste drepturi, ne puteți contacta oricând la: <strong>trenzone483@gmail.com</strong>.
      </p>

      <h2>10. Securitatea datelor</h2>
      <p>
        Implementăm măsuri tehnice și organizatorice de ultimă oră pentru protejarea datelor împotriva accesului neautorizat. Toate datele sensibile sunt transmise prin conexiuni securizate SSL de 256-bit.
      </p>

      <h2>11. Politica privind cookie-urile</h2>
      <p>
        Site-ul folosește cookie-uri pentru a îmbunătăți experiența utilizatorului. Pentru detalii complete, vă invităm să consultați <strong>Politica Cookie</strong> a site‑ului nostru.
      </p>

      <h2>12. Modificări ale politicii</h2>
      <p>
        Ne rezervăm dreptul de a modifica această Politică de Confidențialitate. Orice versiune actualizată va fi publicată transparent pe această pagină.
      </p>
    </LegalContent>
  );
}
