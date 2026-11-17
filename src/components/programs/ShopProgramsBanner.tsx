"use client";

import Image from "next/image";
import { useLocale } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { getCdnUrl } from "@/lib/utils/cdn";
import { LanguageFlagSvg } from "./LanguageFlagSvg";

export function ShopProgramsBanner() {
  const locale = useLocale();
  const isRo = locale !== "en";

  const mockupImg = getCdnUrl("/images/products/program_complete_trio_v2.webp");

  return (
    <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
      <Link
        href="/programs"
        className="group block rounded-2xl md:rounded-3xl bg-zinc-900/75 hover:bg-zinc-900/90 border border-white/10 hover:border-[#e32f8c]/50 p-5 sm:p-7 md:p-8 relative overflow-hidden shadow-2xl backdrop-blur-md transition-all duration-300 active:scale-[0.98]"
      >
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#e32f8c]/15 rounded-full blur-3xl pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-70" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* 3D 3-Books Mockup Visual */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative aspect-[1360/1440] w-full max-w-[280px] sm:max-w-[320px] rounded-2xl overflow-hidden bg-[#050507] border border-white/10 shadow-xl">
              <Image
                src={mockupImg}
                alt={isRo ? "Programele lui Vlad Tren — Pachet Complet (3 în 1)" : "Vlad Tren Programs — Complete Bundle (3-in-1)"}
                fill
                sizes="(max-width: 768px) 75vw, 320px"
                className="object-contain p-1 transition-transform duration-700 ease-out group-hover:scale-[1.03]"
              />
            </div>
          </div>

          {/* Copy, Language Flags & CTA Redirect to /programs */}
          <div className="lg:col-span-7 flex flex-col justify-between text-center lg:text-left items-center lg:items-start">
            <div className="flex flex-col items-center lg:items-start">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#e32f8c]/15 border border-[#e32f8c]/35 text-[#e32f8c] text-[10px] sm:text-xs font-black uppercase tracking-wider mb-3">
                {isRo ? "PROGRAME DIGITALE · -27% LA PACHET" : "DIGITAL PROGRAMS · SAVE 27%"}
              </span>

              <h2 className="font-heading font-black text-2xl sm:text-3xl md:text-4xl uppercase tracking-tight text-white group-hover:text-[#e32f8c] transition-colors leading-tight">
                {isRo ? "PROGRAMELE LUI VLAD TREN" : "VLAD TREN'S PROGRAMS"}
              </h2>

              <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed mt-2.5 max-w-xl">
                {isRo
                  ? "Food Plan, Training Program și Bench Program. Disponibile separat sau în Pachet Complet (3 în 1), cu livrare instantă pe email."
                  : "Food Plan, Training Program, and Bench Program. Available individually or in the Complete Bundle (3-in-1), delivered instantly by email."}
              </p>

              {/* Crisp Language Flags (English first, Romanian second) */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 mt-3.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-200">
                  <LanguageFlagSvg isEnglish={true} className="w-[18px] h-[12px]" />
                  <span>English</span>
                </span>
                <span className="text-zinc-600 text-xs">·</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-200">
                  <LanguageFlagSvg isEnglish={false} className="w-[18px] h-[12px]" />
                  <span>Română</span>
                </span>
              </div>
            </div>

            <div className="mt-5 w-full sm:w-auto">
              <span className="w-full sm:w-auto py-3.5 px-8 rounded-xl bg-white group-hover:bg-[#e32f8c] group-hover:text-white text-black font-black uppercase text-xs tracking-wider transition-all duration-300 inline-flex items-center justify-center gap-2.5 shadow-lg">
                <span>{isRo ? "VEZI TOATE PROGRAMELE" : "EXPLORE ALL PROGRAMS"}</span>
                <ArrowRight className="w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    </section>
  );
}

