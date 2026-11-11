"use client";

import { useLocale } from "next-intl";
import { LegalContent } from "@/components/legal/LegalContent";

export default function CookiePolicyPage() {
  const locale = useLocale();
  const isEn = locale === "en";

  return (
    <LegalContent 
      title={isEn ? "Cookie Policy" : "Politica de Cookie-uri"} 
      lastUpdated={isEn ? "November 5, 2026" : "5 noiembrie 2026"}
    >
      <h2>{isEn ? "1. What are cookies?" : "1. Ce sunt cookie-urile?"}</h2>
      <p>
        {isEn ? (
          <>
            Cookies are small text files stored on your device (computer, tablet, smartphone) when you visit our website, operated by <strong>TrenZone LLC</strong> (Filing ID: <strong>GZ-US-WY-1790986605415</strong>, 75 E 3RD ST, SHERIDAN, WY, 82801, USA). These files ensure optimal technical functioning of the store, remember your cart and language preferences, and provide a secure, seamless checkout experience.
          </>
        ) : (
          <>
            Cookie-urile sunt fișiere text de mici dimensiuni stocate pe dispozitivul dvs. (computer, tabletă, smartphone) atunci când vizitați magazinul nostru online, operat de <strong>TrenZone LLC</strong> (Număr Înregistrare: <strong>GZ-US-WY-1790986605415</strong>, 75 E 3RD ST, SHERIDAN, WY, 82801, USA). Acestea sunt utilizate pentru a asigura funcționarea optimă a platformei noastre, salvarea coșului de cumpărături, securizarea plăților și oferirea unei experiențe personalizate fiecărui utilizator.
          </>
        )}
      </p>

      <h2>{isEn ? "2. Classification of cookies used" : "2. Clasificarea Cookie-urilor utilizate"}</h2>
      <p>
        {isEn ? (
          <>
            On <strong>trenzone.fit</strong> we use a strictly controlled set of cookies and tracking technologies, classified as follows:
          </>
        ) : (
          <>
            Pe <strong>trenzone.fit</strong> utilizăm un număr strict controlat de trackere și module cookie, structurate astfel:
          </>
        )}
      </p>
      
      <div className="overflow-x-auto my-8">
        <table className="w-full text-left border-collapse bg-white rounded-2xl overflow-hidden shadow-sm border border-zinc-100">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isEn ? "Cookie Name" : "Denumire Cookie"}
              </th>
              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isEn ? "Category / Role" : "Tip / Rol"}
              </th>
              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isEn ? "Duration" : "Durată"}
              </th>
              <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isEn ? "Description & Purpose" : "Descriere & Scop"}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 text-sm">
            <tr className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-6 font-bold text-black font-mono text-xs">NEXT_LOCALE</td>
              <td className="py-4 px-6">
                <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? "Strictly Necessary" : "Strict Necesar"}
                </span>
              </td>
              <td className="py-4 px-6 text-zinc-500">{isEn ? "1 year" : "1 an"}</td>
              <td className="py-4 px-6 text-zinc-600">
                {isEn ? "Stores your language preference (Romanian or English)." : "Reține preferința ta de limbă (Română sau Engleză)."}
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-6 font-bold text-black font-mono text-xs">cart_session / cart_id</td>
              <td className="py-4 px-6">
                <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? "Strictly Necessary" : "Strict Necesar"}
                </span>
              </td>
              <td className="py-4 px-6 text-zinc-500">{isEn ? "30 days" : "30 zile"}</td>
              <td className="py-4 px-6 text-zinc-600">
                {isEn 
                  ? "Retains cart items and applied bundle discounts between visits." 
                  : "Păstrează produsele adăugate în coș și reducerile de pachet aplicate între vizite."}
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-6 font-bold text-black font-mono text-xs">Stripe (__stripe_mid, __stripe_sid)</td>
              <td className="py-4 px-6">
                <span className="bg-[#e32f8c]/10 text-[#e32f8c] px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? "Security & Payments" : "Securitate & Plăți"}
                </span>
              </td>
              <td className="py-4 px-6 text-zinc-500">{isEn ? "Session / 1 year" : "Sesiune / 1 an"}</td>
              <td className="py-4 px-6 text-zinc-600">
                {isEn 
                  ? "Required for 3D-Secure 2 fraud prevention and encrypted credit card payment processing via Stripe Inc." 
                  : "Necesare pentru prevenirea fraudei (3D-Secure 2) și procesarea securizată a tranzacțiilor prin card cu Stripe Inc."}
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-6 font-bold text-black font-mono text-xs">cookie_consent</td>
              <td className="py-4 px-6">
                <span className="bg-zinc-100 text-zinc-700 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? "Strictly Necessary" : "Strict Necesar"}
                </span>
              </td>
              <td className="py-4 px-6 text-zinc-500">{isEn ? "6 months" : "6 luni"}</td>
              <td className="py-4 px-6 text-zinc-600">
                {isEn ? "Stores your cookie banner choices." : "Stochează opțiunile tale exprimate în bannerul de consimțământ."}
              </td>
            </tr>
            <tr className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 px-6 font-bold text-black font-mono text-xs">_ga, _ga_* (Google Analytics)</td>
              <td className="py-4 px-6">
                <span className="bg-black text-white px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  {isEn ? "Analytics (Optional)" : "Analiză (Opțional)"}
                </span>
              </td>
              <td className="py-4 px-6 text-zinc-500">{isEn ? "Up to 2 years" : "Până la 2 ani"}</td>
              <td className="py-4 px-6 text-zinc-600">
                {isEn 
                  ? "Collects anonymized traffic statistics to optimize store performance and navigation flows." 
                  : "Colectează date statistice anonime pentru a ne ajuta să optimizăm fluxul de navigare și viteza site-ului."}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>{isEn ? "3. Cookie consent & control" : "3. Controlul Consimțământului"}</h2>
      <p>
        {isEn ? (
          <>
            In compliance with Directive 2002/58/EC (ePrivacy Directive) and GDPR, strictly necessary cookies are enabled automatically as they are essential for operating the web shop (shopping cart, security, CSRF protection). Optional analytics and marketing cookies are only placed if you grant explicit consent. You can modify your browser settings at any time to block or delete cookies, though this may prevent you from completing purchases.
          </>
        ) : (
          <>
            În conformitate cu Directiva 2002/58/CE (Directiva ePrivacy) și Regulamentul GDPR, cookie-urile strict necesare sunt activate automat, fiind indispensabile bunei funcționări a magazinului (menținerea coșului, securitate împotriva atacurilor CSRF). Cookie-urile opționale de analiză sau marketing sunt active doar cu acordul dumneavoastră expres. Puteți modifica setările browserului oricând pentru a bloca sau șterge cookie-urile, însă acest lucru poate afecta funcționarea coșului și finalizarea comenzilor.
          </>
        )}
      </p>

      <h2>{isEn ? "4. Data persistence" : "4. Persistența Datelor"}</h2>
      <ul>
        <li>
          <strong>{isEn ? "Session Cookies:" : "Cookie-uri de Sesiune:"}</strong>{" "}
          {isEn ? "Automatically erased when you close your browser tab or window." : "Se elimină automat la închiderea ferestrei de navigare."}
        </li>
        <li>
          <strong>{isEn ? "Persistent Cookies:" : "Cookie-uri Persistente:"}</strong>{" "}
          {isEn 
            ? "Remain stored on your device for their defined lifespan (between 30 days and 12 months) or until you manually clear your browser cache." 
            : "Rămân stocate pe dispozitiv pentru o perioadă determinată (între 30 de zile și 12 luni) sau până la ștergerea manuală a istoricului."}
        </li>
      </ul>

      <h2>{isEn ? "5. Contact & Privacy Inquiries" : "5. Contact & Suport Date"}</h2>
      <p>
        {isEn ? (
          <>
            For any inquiries regarding our use of cookies or your data privacy rights, you can reach our Data Protection Officer and compliance team at:{" "}
            <strong><a href="mailto:trenzone483@gmail.com">trenzone483@gmail.com</a></strong>.
          </>
        ) : (
          <>
            Pentru orice întrebări sau solicitări privind tehnologiile de stocare utilizate ori drepturile dumneavoastră GDPR, ne puteți contacta direct la adresa oficială:{" "}
            <strong><a href="mailto:trenzone483@gmail.com">trenzone483@gmail.com</a></strong>.
          </>
        )}
      </p>
    </LegalContent>
  );
}
