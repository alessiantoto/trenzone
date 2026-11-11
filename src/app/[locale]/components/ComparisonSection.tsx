"use client";

import { Check, X } from "lucide-react";
import { useLocale } from "next-intl";

export function ComparisonSection() {
  const locale = useLocale();
  const isRo = locale === "ro";

  const comparisonPoints = [
    {
      id: "material",
      feature: isRo ? "Material & Elasticitate" : "Material & Elasticity",
      trenzone: isRo 
        ? "Poliester elastic dens. Își păstrează compresia și nu se lărgește după luni de antrenamente grele." 
        : "High-density elastic weave. Retains tension and rebound through months of heavy lifting.",
      others: isRo 
        ? "Bumbac elastic subțire. Se lărgește rapid și își pierde suportul după doar câteva săptămâni." 
        : "Thin cotton-stretch. Permanently stretches out within weeks and loses support.",
    },
    {
      id: "rebound",
      feature: isRo ? "Suport pe Cot & Rebound" : "Elbow Support & Rebound",
      trenzone: isRo 
        ? "Compresie fermă pe tendon. Blochează jocul cotului și oferă rebound curat la ieșirea de pe piept." 
        : "Firm joint and tendon compression. Delivers solid stopping power and clean rebound off the chest.",
      others: isRo 
        ? "Doar țin cotul cald. Zero asistență mecanică reală când ai greutate mare pe bară." 
        : "Only keeps the joint warm. Zero actual mechanical carryover under heavy loads.",
    },
    {
      id: "grip",
      feature: isRo ? "Aderență pe Braț" : "Grip on Arm",
      trenzone: isRo 
        ? "Textură aderentă anti-alunecare. Rămâne blocată pe braț chiar și când transpiri abundent." 
        : "Textured anti-slip weave. Stays locked to your arm through every rep without sliding.",
      others: isRo 
        ? "Material neted care alunecă pe piele și necesită restrângere continuă între serii." 
        : "Slick finish that slides down your skin, requiring constant re-wrapping between sets.",
    },
    {
      id: "stitching",
      feature: isRo ? "Cusături & Rezistență" : "Stitching & Pull Strength",
      trenzone: isRo 
        ? "Cusături duble ranforsate. Poți trage la maximum de bandă fără frică de rupere." 
        : "Reinforced double-stitching. Pull with full force without risk of tearing.",
      others: isRo 
        ? "Ață simplă subțire care se destramă la capete când este strânsă puternic." 
        : "Single thin thread stitching that easily frays and tears under tension.",
    },
    {
      id: "levels",
      feature: isRo ? "Alegerea Nivelului de Forță" : "Calibrated Strength Tiers",
      trenzone: isRo 
        ? "Două modele clare: X5 pentru antrenamente zilnice și X10 pentru greutăți extreme." 
        : "Two calibrated models: X5 for high-volume bodybuilding and X10 for heavy PRs.",
      others: isRo 
        ? "Mărime universală unică, de obicei prea moale pentru eforturi mari." 
        : "One-size-fits-all generic tension that is usually too soft for max-effort lifts.",
    }
  ];

  return (
    <section className="py-14 sm:py-20 md:py-24 bg-transparent text-white relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#e32f8c]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 md:px-8 max-w-4xl relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#e32f8c] text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-3">
            <span>{isRo ? "COMPARAȚIE DIRECTĂ" : "HEAD-TO-HEAD COMPARISON"}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-2.5 font-[family-name:var(--font-oswald)]">
            {isRo ? (
              <>TRENZONE® VS <span className="text-[#e32f8c]">BENZI OBIȘNUITE</span></>
            ) : (
              <>TRENZONE® VS <span className="text-[#e32f8c]">GENERIC WRAPS</span></>
            )}
          </h2>

          <p className="text-zinc-400 text-xs sm:text-sm md:text-base font-normal leading-relaxed">
            {isRo 
              ? "Diferențele reale când ești sub o bară grea."
              : "The real differences when you're under heavy weight."}
          </p>
        </div>

        {/* ======================================================== */}
        {/* MOBILE VIEW (Clean, minimal, no nested boxes) */}
        {/* ======================================================== */}
        <div className="block md:hidden space-y-3">
          {comparisonPoints.map((item) => (
            <div 
              key={item.id} 
              className="rounded-2xl bg-zinc-900/60 border border-white/10 p-4 transition-all"
            >
              {/* Feature title */}
              <h3 className="text-xs font-black uppercase tracking-wider text-white mb-3">
                {item.feature}
              </h3>

              {/* Rows */}
              <div className="space-y-2">
                {/* TrenZone row */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#e32f8c]/10 border border-[#e32f8c]/25">
                  <div className="w-5 h-5 rounded-full bg-[#e32f8c] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#e32f8c] mb-0.5">
                      TrenZone®
                    </div>
                    <p className="text-xs text-zinc-100 font-medium leading-relaxed">
                      {item.trenzone}
                    </p>
                  </div>
                </div>

                {/* Generic row */}
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-zinc-950/50 border border-white/5">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
                      {isRo ? "Benzi Obișnuite" : "Generic Wraps"}
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {item.others}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* ======================================================== */}
        {/* DESKTOP VIEW (Clean Comparison Table) */}
        {/* ======================================================== */}
        <div className="hidden md:block bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {/* Table Header */}
          <div className="grid grid-cols-12 bg-zinc-900/90 border-b border-white/10 items-center">
            <div className="col-span-4 p-5 text-xs font-black uppercase tracking-wider text-zinc-400">
              {isRo ? "CRITERIU" : "CRITERIA"}
            </div>
            <div className="col-span-4 p-5 bg-[#e32f8c]/10 border-x border-[#e32f8c]/25 border-t-2 border-t-[#e32f8c] flex items-center justify-between">
              <span className="text-sm font-black text-white tracking-wider">
                TRENZONE® X5 / X10
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#e32f8c] text-white">
                BENCHMARK
              </span>
            </div>
            <div className="col-span-4 p-5 text-xs font-black uppercase tracking-wider text-zinc-500">
              {isRo ? "BENZI OBIȘNUITE" : "GENERIC WRAPS"}
            </div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-white/5">
            {comparisonPoints.map((item) => (
              <div 
                key={item.id} 
                className="grid grid-cols-12 items-stretch hover:bg-white/[0.015] transition-colors"
              >
                {/* Feature Name */}
                <div className="col-span-4 p-5 flex items-center font-bold text-sm text-white border-r border-white/5">
                  {item.feature}
                </div>

                {/* TrenZone Column */}
                <div className="col-span-4 p-5 bg-[#e32f8c]/[0.03] border-r border-[#e32f8c]/20 flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#e32f8c] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(227,47,140,0.3)]">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                  <p className="text-sm text-zinc-100 font-medium leading-relaxed">
                    {item.trenzone}
                  </p>
                </div>

                {/* Competitors Column */}
                <div className="col-span-4 p-5 flex items-start gap-3 text-zinc-400">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {item.others}
                  </p>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
