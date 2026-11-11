import { setRequestLocale } from "next-intl/server";
import { Metadata } from "next";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { ArrowRight } from "lucide-react";
import { Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { FormattedPrice } from "@/components/common/FormattedPrice";
import { getProductsServer } from "@/app/actions/products";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const isRo = rawLocale !== "en";

  return {
    title: isRo 
      ? "Despre Noi — TREN ZONE | Construit pentru Forță. Proiectat pentru Performanță."
      : "About Us — TREN ZONE | Built for Strength. Designed for Performance.",
    description: isRo
      ? "La Tren Zone, credem că fiecare repetiție contează și fiecare limită este făcută să fie depășită. Echipament conceput pentru sportivii care cer mai mult de la ei înșiși."
      : "At Tren Zone, we believe every rep matters and every limit is meant to be challenged. Built for athletes who demand more from themselves."
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = (rawLocale === "en" ? "en" : "ro") as "ro" | "en";
  setRequestLocale(locale);
  const isRo = locale === "ro";

  let flagshipProducts: Product[] = [
    {
      id: "997b3e3c-511b-4e02-8a58-7d59bbf5a154",
      slug: "x5-elbow-wraps",
      name: {
        ro: "TRENZONE X5 Elbow Wraps — Purple",
        en: "TRENZONE X5 Elbow Wraps — Purple"
      },
      price: 329.99,
      originalPrice: 379.99,
      badge: undefined,
      image: "/images/products/x5_elbow_wraps_purple_1.webp",
      images: [
        "/images/products/x5_elbow_wraps_purple_1.webp",
        "/images/products/x5_elbow_wraps_purple_2.webp"
      ],
      description: {
        ro: "Ediția Purple X5. Protecție excelentă împotriva durerilor de tendoane, mobilitate completă și stabilitate articulară la fiecare repetare.",
        en: "Purple X5 Edition. Maximum tendon comfort, full mobility, and joint stability for high volume pressing sessions."
      },
      stock_quantity: 60,
      weight: 0.7,
      length_mm: 1000,
      width_mm: 75,
      height_mm: 10,
      is_active: true
    },
    {
      id: "2fd4ee73-6800-4f76-a74d-208fffea0fb6",
      slug: "x10-elbow-wraps",
      name: {
        ro: "TRENZONE X10 Elbow Wraps — Purple",
        en: "TRENZONE X10 Elbow Wraps — Purple"
      },
      price: 529.99,
      originalPrice: 599.99,
      badge: isRo ? "SUPORT MAXIM · PR-URI" : "MAX SUPPORT · PRs",
      image: "/images/products/x10_elbow_wraps_purple_1.webp",
      images: [
        "/images/products/x10_elbow_wraps_purple_1.webp",
        "/images/products/x10_elbow_wraps_purple_2.webp"
      ],
      description: {
        ro: "Ediția Purple X10. Rigiditate extremă de competiție, densitate multi-strat de 1.2 kg și până la +20 kg asistență mecanică la ieșirea din piept.",
        en: "Purple X10 Edition. Extreme competition-grade stiffness, 1.2 kg multi-layered weave, and up to +20 kg mechanical rebound assist on heavy loads."
      },
      stock_quantity: 45,
      weight: 1.2,
      length_mm: 1000,
      width_mm: 80,
      height_mm: 15,
      is_active: true
    }
  ];

  try {
    const allProducts = await getProductsServer();
    const x5 = allProducts.find(p => p.slug.startsWith("x5") && p.slug.includes("purple")) || allProducts.find(p => p.slug.includes("x5"));
    const x10 = allProducts.find(p => p.slug.startsWith("x10") && p.slug.includes("purple")) || allProducts.find(p => p.slug.includes("x10"));
    if (x5 && x10) {
      flagshipProducts = [x5, x10];
    }
  } catch {
    // fallback to static products
  }

  const stats = [
    {
      value: "PRO-TESTED",
      label: isRo ? "Calibrate pe Sarcini Grele" : "Gym-Tested Under Heavy Loads"
    },
    {
      value: isRo ? "2 MODELE" : "2 MODELS",
      label: isRo ? "X5 (Volum) & X10 (Forță)" : "X5 (Volume) & X10 (Max PR)"
    },
    {
      value: "100%",
      label: isRo ? "Construcție Heavy-Duty" : "Heavy-Duty Construction"
    }
  ];

  const whyPoints = [
    {
      number: "01",
      title: isRo ? "Suport Calibrat pe Performanță" : "Performance-Driven Support",
      desc: isRo 
        ? "Proiectat pentru a oferi susținere fermă și stabilitate maximă pe ridicările grele."
        : "Designed to provide support and stability during demanding lifts."
    },
    {
      number: "02",
      title: isRo ? "Construit pentru Antrenamente Grele" : "Built for Serious Training",
      desc: isRo 
        ? "Creat pentru sportivii care își iau în serios fiecare intrare în sală."
        : "Made for athletes who take every session seriously."
    },
    {
      number: "03",
      title: isRo ? "Încredere Sub Presiune" : "Confidence Under Pressure",
      desc: isRo 
        ? "Antrenează-te cu siguranță deplină atunci când ataci următorul tău record personal."
        : "Train with greater confidence when working toward your next personal record."
    },
    {
      number: "04",
      title: isRo ? "O Mentalitate de Învingător" : "A Stronger Mindset",
      desc: isRo 
        ? "Fiecare sesiune este o oportunitate de a progresa, a evolua și a deveni mai bun decât ieri."
        : "Every workout is an opportunity to improve, progress, and become better than yesterday."
    }
  ];

  return (
    <div className="min-h-screen bg-[#030305] text-white pt-20 sm:pt-28 md:pt-36 pb-16 sm:pb-24 selection:bg-[#e32f8c] selection:text-white relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#e32f8c]/10 rounded-full blur-[170px] pointer-events-none" />
      <div className="absolute top-2/3 right-10 w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 lg:px-12 max-w-6xl xl:max-w-7xl relative z-10">
        
        {/* ======================================================== */}
        {/* 1. HERO HEADER */}
        {/* ======================================================== */}
        <div className="text-center max-w-4xl mx-auto mb-8 sm:mb-14 md:mb-18">
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#e32f8c] mb-3 sm:mb-5">
            <span>{isRo ? "DESPRE NOI — TREN ZONE" : "ABOUT US — TREN ZONE"}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-3 sm:mb-6 font-heading leading-[1.1] sm:leading-[1.08] break-words">
            {isRo ? (
              <>CONSTRUIT PENTRU FORȚĂ. <span className="text-[#e32f8c]">PROIECTAT PENTRU PERFORMANȚĂ.</span></>
            ) : (
              <>BUILT FOR STRENGTH. <span className="text-[#e32f8c]">DESIGNED FOR PERFORMANCE.</span></>
            )}
          </h1>

          <p className="text-zinc-400 text-xs sm:text-base md:text-lg font-normal leading-relaxed max-w-2xl mx-auto">
            {isRo 
              ? "La Tren Zone, credem că fiecare repetiție contează, fiecare detaliu face diferența și orice limită este făcută să fie depășită."
              : "At Tren Zone, we believe that every rep matters, every detail counts, and every limit is meant to be challenged."}
          </p>
        </div>

        {/* ======================================================== */}
        {/* 2. STATS BAR (Sleek Connected Ribbon - 3 Columns on all devices) */}
        {/* ======================================================== */}
        <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 p-2 sm:p-4 mb-10 sm:mb-16 md:mb-20 shadow-2xl backdrop-blur-md">
          <div className="grid grid-cols-3 divide-x divide-white/10">
            {stats.map((s, i) => (
              <div 
                key={i}
                className="py-3 px-1 sm:py-6 sm:px-4 md:py-7 md:px-6 text-center flex flex-col justify-center"
              >
                <div className="text-lg sm:text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight mb-0.5 sm:mb-1.5 font-heading">
                  {s.value}
                </div>
                <div className="text-[8px] sm:text-xs md:text-sm font-bold uppercase tracking-wider text-zinc-400 leading-tight">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. STORY SECTION WITH VISUAL */}
        {/* ======================================================== */}
        <div className="rounded-2xl sm:rounded-3xl bg-zinc-950/80 border border-white/10 p-4 sm:p-8 md:p-12 lg:p-14 mb-10 sm:mb-16 md:mb-20 shadow-2xl relative overflow-hidden backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-14 items-center">
            
            {/* Visual on Left */}
            <div className="lg:col-span-5 flex justify-center w-full">
              <div className="relative aspect-[4/3] sm:aspect-[4/5] w-full max-w-md lg:max-w-none rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 shadow-2xl group min-h-0 sm:min-h-[440px] lg:min-h-[500px]">
                <Image
                  src="/images/home/hero.jpg"
                  alt="Tren Zone in action"
                  fill
                  className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 1024px) 90vw, 500px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 sm:bottom-5 left-3 sm:left-5 right-3 sm:right-5 text-center">
                  <span className="text-[9px] sm:text-xs font-black uppercase tracking-widest text-zinc-300 bg-black/70 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/15 inline-block shadow-lg">
                    {isRo ? "Testat în Sală · Vlad Tren" : "Gym Tested · Vlad Tren"}
                  </span>
                </div>
              </div>
            </div>

            {/* Narrative Copy on Right */}
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-5 md:space-y-6 text-zinc-300 text-xs sm:text-base md:text-lg leading-relaxed font-normal">
              <span className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#e32f8c] block">
                {isRo ? "POVESTEA BRANDULUI" : "THE BRAND STORY"}
              </span>

              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-black uppercase text-white tracking-tight font-heading leading-tight">
                {isRo ? "ECHIPAMENT PENTRU CEI CARE CER MAI MULT" : "ENGINEERED FOR THOSE WHO DEMAND MORE"}
              </h2>

              <p>
                {isRo 
                  ? "Am creat Tren Zone pentru sportivii care cer mai mult de la ei înșiși — cei care se antrenează cu un scop precis, își forțează limitele și refuză mediocritatea."
                  : "We created Tren Zone for athletes who demand more from themselves — those who train with purpose, push beyond their comfort zone, and refuse to settle for average."}
              </p>

              <p>
                {isRo 
                  ? "Benzile noastre de cot X10 sunt concepute să ofere suportul, stabilitatea și încrederea de care ai nevoie în cele mai grele serii. Fie că alergi după un nou PR, crești greutățile de lucru sau construiești o disciplină de fier în sală, Tren Zone este aici să te susțină la fiecare pas."
                  : "Our X10 Elbow Wraps are designed to deliver the support, stability, and confidence you need during demanding training sessions. Whether you’re chasing a new PR, increasing your working weights, or building consistency in the gym, Tren Zone is here to support your journey."}
              </p>

              <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-[#e32f8c]/10 border-l-4 border-[#e32f8c] shadow-inner">
                <p className="text-white font-black text-xs sm:text-sm md:text-base uppercase tracking-wider">
                  {isRo ? "Mai mult suport. Mai multă stabilitate. Mai multă încredere sub bară." : "More support. More stability. More confidence under the bar."}
                </p>
              </div>

              <p>
                {isRo 
                  ? "Credem că echipamentul premium de forță trebuie să îmbine ingineria orientată pe performanță, materiale de top și o fixare sigură pe braț — ca tu să te poți concentra pe ceea ce contează cu adevărat: să devii mai puternic."
                  : "We believe premium training gear should combine performance-driven design, quality materials, and a comfortable, secure fit — so you can focus on what matters most: getting stronger."}
              </p>
            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. WHY TREN ZONE? (CARD GRID) */}
        {/* ======================================================== */}
        <div className="mb-10 sm:mb-16 md:mb-20">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-10 md:mb-14">
            <span className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#e32f8c] block mb-1.5 sm:mb-2">
              {isRo ? "VALORILE NOASTRE" : "OUR VALUES"}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white font-heading">
              {isRo ? "DE CE TREN ZONE?" : "WHY TREN ZONE?"}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5 md:gap-7">
            {whyPoints.map((item, idx) => (
              <div 
                key={idx}
                className="p-4 sm:p-7 md:p-9 rounded-xl sm:rounded-3xl bg-zinc-900/60 border border-white/10 relative overflow-hidden backdrop-blur-sm flex flex-col justify-between group hover:border-[#e32f8c]/40 hover:bg-zinc-900/80 transition-all duration-300"
              >
                <div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-zinc-500 block mb-1.5 sm:mb-3 group-hover:text-[#e32f8c] transition-colors">
                    {item.number}
                  </span>
                  <h3 className="text-sm sm:text-lg md:text-xl font-black uppercase tracking-wide text-white mb-1.5 sm:mb-2.5 font-heading">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base text-zinc-400 font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 5. YOUR NEXT PR STARTS HERE & THE 2 PRODUCTS UNDER IT */}
        {/* ======================================================== */}
        <div className="mb-10 sm:mb-16 md:mb-20">
          <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10 md:mb-14">
            <span className="text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] text-[#e32f8c] block mb-1.5 sm:mb-2">
              {isRo ? "PERFORMANȚĂ MAXIMĂ" : "MAXIMUM PERFORMANCE"}
            </span>
            <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white mb-3 sm:mb-4 font-heading">
              {isRo ? "URMĂTORUL TĂU PR ÎNCEPE AICI." : "YOUR NEXT PR STARTS HERE."}
            </h2>
            <div className="space-y-2 sm:space-y-3 text-zinc-300 text-xs sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              <p>
                {isRo 
                  ? "La Tren Zone, forța nu înseamnă doar să pui mai multe discuri pe bară. Înseamnă să fii prezent zi de zi, să rămâi consecvent și să muncești pentru fiecare gram de progres."
                  : "At Tren Zone, strength isn’t just about lifting heavier. It’s about showing up, staying consistent, and earning every bit of progress."}
              </p>
              <p>
                {isRo 
                  ? "Suntem aici pentru sportivii care refuză să renunțe, pentru cei care se autodepășesc constant și pentru toți cei care știu că performanța se clădește repetiție cu repetiție."
                  : "We’re here for the athletes who keep pushing, the lifters who keep improving, and the people who know that greatness is built one rep at a time."}
              </p>
            </div>

            {/* Motivational Tagline Banner */}
            <div className="mt-5 sm:mt-7 w-full sm:w-auto inline-flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-4 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-zinc-900/80 border border-white/10 backdrop-blur-sm shadow-lg text-center">
              <span className="text-[#e32f8c] font-black text-xs sm:text-sm md:text-base uppercase tracking-wider">
                {isRo ? "Trage tare. Rămâi focusat. Devino mai puternic." : "Train hard. Stay focused. Get stronger."}
              </span>
              <span className="hidden sm:inline text-zinc-600 font-bold">·</span>
              <span className="text-white font-black text-[11px] sm:text-sm md:text-base uppercase tracking-wider">
                {isRo ? "TREN ZONE — RIDICĂ-ȚI NIVELUL DE ANTRENAMENT." : "TREN ZONE — ELEVATE YOUR TRAINING."}
              </span>
            </div>
          </div>

          {/* THE 2 FLAGSHIP PRODUCTS — Compact 2-column comparison visible side-by-side on mobile */}
          <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3 sm:gap-6 mb-8">
            {/* Card X5 */}
            <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/80 border border-white/10 p-3 sm:p-5 flex flex-col justify-between hover:border-white/30 transition-all duration-300 group">
              <div>
                {/* Badge & Price Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <span className="self-start px-2 py-0.5 text-[8px] sm:text-[11px] font-black uppercase tracking-wider rounded-md bg-white/5 text-zinc-300 border border-white/10">
                    {isRo ? "HIPERTROFIE & VOLUM" : "HYPERTROPHY & VOLUME"}
                  </span>
                  <FormattedPrice ronPrice={flagshipProducts[0]?.price || 329.99} className="text-xs sm:text-lg font-black text-white font-heading" />
                </div>

                {/* Square Product Image */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/50 border border-white/5 my-1.5">
                  <Image
                    src="/images/products/x5_elbow_wraps_purple_square.webp"
                    alt="TrenZone X5 Elbow Wraps"
                    fill
                    sizes="(max-width: 640px) 45vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Title & Benefit */}
                <div className="mt-2">
                  <h3 className="text-xs sm:text-lg font-black uppercase tracking-tight text-white font-heading leading-tight">
                    TRENZONE X5
                  </h3>
                  <p className="text-[10px] sm:text-xs text-zinc-400 font-medium line-clamp-2 mt-1 leading-snug">
                    {isRo
                      ? "Confort articular și mobilitate naturală pentru serii de volum"
                      : "Joint comfort & full mobility for volume lifting"}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/product/x5-elbow-wraps"
                className="w-full mt-3 py-2 sm:py-2.5 px-2 rounded-lg sm:rounded-xl bg-white/10 hover:bg-white hover:text-black text-white font-black uppercase text-[9px] sm:text-xs tracking-wider transition-all duration-300 text-center block cursor-pointer border border-white/10 active:scale-95"
              >
                <span>{isRo ? "ALEGE X5" : "CHOOSE X5"}</span>
              </Link>
            </div>

            {/* Card X10 */}
            <div className="rounded-2xl sm:rounded-3xl bg-zinc-900/80 border border-[#e32f8c]/40 p-3 sm:p-5 flex flex-col justify-between hover:border-[#e32f8c] transition-all duration-300 group shadow-[0_0_20px_rgba(227,47,140,0.15)]">
              <div>
                {/* Badge & Price Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                  <span className="self-start px-2 py-0.5 text-[8px] sm:text-[11px] font-black uppercase tracking-wider rounded-md bg-[#e32f8c]/15 text-[#e32f8c] border border-[#e32f8c]/30">
                    {isRo ? "SUPORT MAXIM & PR" : "MAX SUPPORT & PR"}
                  </span>
                  <FormattedPrice ronPrice={flagshipProducts[1]?.price || 529.99} className="text-xs sm:text-lg font-black text-white font-heading" />
                </div>

                {/* Square Product Image */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/50 border border-white/5 my-1.5">
                  <Image
                    src="/images/products/x10_elbow_wraps_purple_square.webp"
                    alt="TrenZone X10 Elbow Wraps"
                    fill
                    sizes="(max-width: 640px) 45vw, 300px"
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>

                {/* Title & Benefit */}
                <div className="mt-2">
                  <h3 className="text-xs sm:text-lg font-black uppercase tracking-tight text-white font-heading leading-tight">
                    TRENZONE X10
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[#e32f8c] font-medium line-clamp-2 mt-1 leading-snug">
                    {isRo
                      ? "Rigiditate extremă de competiție și asistență la ieșirea din piept"
                      : "Extreme competition stiffness & lockout rebound assist"}
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <Link
                href="/product/x10-elbow-wraps"
                className="w-full mt-3 py-2 sm:py-2.5 px-2 rounded-lg sm:rounded-xl bg-[#e32f8c] hover:bg-[#ff3b99] text-white font-black uppercase text-[9px] sm:text-xs tracking-wider transition-all duration-300 text-center block cursor-pointer shadow-[0_0_15px_rgba(227,47,140,0.35)] active:scale-95"
              >
                <span>{isRo ? "ALEGE X10" : "CHOOSE X10"}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. CLOSING CTA BANNER — DESCOPERĂ TOATE PRODUSELE */}
        {/* ======================================================== */}
        <div className="relative rounded-2xl sm:rounded-3xl bg-gradient-to-b from-zinc-900/90 via-zinc-900/70 to-black/90 border border-white/10 p-5 sm:p-10 md:p-14 text-center overflow-hidden backdrop-blur-md shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {/* Ambient Glow */}
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-40 bg-[#e32f8c]/25 rounded-full blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-80 sm:w-96 h-40 bg-purple-600/15 rounded-full blur-[90px] pointer-events-none" />

          <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
            {/* Tag */}
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/10 border border-[#e32f8c]/25 text-[#e32f8c] text-[9px] sm:text-[11px] font-black uppercase tracking-[0.2em] mb-3 sm:mb-4">
              <span>{isRo ? "MAGAZINUL OFICIAL TRENZONE®" : "OFFICIAL TRENZONE® STORE"}</span>
            </div>

            {/* Headline */}
            <h2 className="text-xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2 sm:mb-3 font-heading">
              {isRo ? "DESCOPERĂ TOATE PRODUSELE" : "DISCOVER ALL PRODUCTS"}
            </h2>

            {/* Subtitle */}
            <p className="text-zinc-400 text-xs sm:text-sm font-normal max-w-md mx-auto mb-5 sm:mb-7 leading-relaxed">
              {isRo 
                ? "Explorează toată gama de benzi de cot: edițiile X5 și X10, toate variantele de culori și echipamentele calibrate pentru forță fără compromis."
                : "Explore our complete lineup: X5 & X10 stiffness tiers, all colorways, and heavy-duty gear built for unyielding performance."}
            </p>

            {/* CTA Button */}
            <Link
              href="/shop"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 py-3.5 px-6 sm:px-10 rounded-xl bg-[#e32f8c] hover:bg-[#ff3b99] text-white font-black uppercase text-xs sm:text-sm tracking-wider transition-all duration-300 shadow-[0_0_25px_rgba(227,47,140,0.45)] hover:shadow-[0_0_35px_rgba(227,47,140,0.65)] active:scale-95 group cursor-pointer"
            >
              <span>{isRo ? "DESCOPERĂ TOATE PRODUSELE" : "DISCOVER ALL PRODUCTS"}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Micro trust highlights (clean typography, no icons/emojis) */}
            <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-white/5 flex flex-wrap items-center justify-center gap-2 sm:gap-6 text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider">
              <span>{isRo ? "Modele X5 & X10" : "X5 & X10 Models"}</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <span>{isRo ? "Construcție Heavy-Duty" : "Heavy-Duty Construction"}</span>
              <span className="text-white/20 hidden sm:inline">·</span>
              <span>{isRo ? "Protecție Articulară & PR" : "Joint Protection & PR Assist"}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
