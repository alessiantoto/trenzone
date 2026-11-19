"use client";

import React, { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  PROGRAM_RICH_DETAILS,
  type ProgramDetailKey,
  type ProgramRichDetail,
} from "@/lib/program-details";

interface ProgramDetailPanelProps {
  detail: ProgramRichDetail;
  locale: "ro" | "en";
  isStandaloneOverview?: boolean;
}

const ORDERED_TABS: Array<{
  key: ProgramDetailKey;
  labelRo: string;
  labelEn: string;
}> = [
  { key: "food-plan", labelRo: "Food Plan", labelEn: "Food Plan" },
  { key: "training-program", labelRo: "Training Program", labelEn: "Training Program" },
  { key: "bench-program", labelRo: "Bench Program", labelEn: "Bench Program" },
  { key: "bundle", labelRo: "Pachet 3 în 1", labelEn: "3-in-1 Bundle" },
];

function ProgramDetailPanel({
  detail,
  locale,
  isStandaloneOverview = false,
}: ProgramDetailPanelProps) {
  const pick = (text: { ro: string; en: string }) =>
    locale === "en" ? text.en : text.ro;

  return (
    <div className="space-y-6">
      {/* Compact Overview Strip on /programs only (product page already displays title & summary in hero) */}
      {isStandaloneOverview && (
        <div className="rounded-2xl bg-zinc-900/65 border border-white/10 px-6 py-5 sm:px-7 sm:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e32f8c]">
              {pick(detail.categoryLabel)}
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
              {pick(detail.title)}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed">
              {pick(detail.summary)}
            </p>
          </div>

          <Link
            href={`/product/${detail.slug}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-[#e32f8c] text-black hover:text-white font-black uppercase tracking-wider text-xs transition-colors shrink-0 active:scale-[0.98]"
          >
            <span>{locale === "ro" ? "Vezi programul" : "View program"}</span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </Link>
        </div>
      )}

      {/* Editorial 2-Column Fit & Structure Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 rounded-2xl border border-white/10 bg-zinc-950/70 divide-y lg:divide-y-0 lg:divide-x divide-white/10 overflow-hidden">
        <div className="p-6 sm:p-7 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-[#e32f8c]">
            {pick(detail.forWhoTitle)}
          </h3>
          <ul className="space-y-3">
            {detail.forWho.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium"
              >
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#e32f8c] shrink-0" />
                <span>{pick(item)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 sm:p-7 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            {pick(detail.outcomesTitle)}
          </h3>
          <ul className="space-y-3">
            {detail.outcomes.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed font-medium"
              >
                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                <span>{pick(item)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Ruled Table-of-Contents Style Breakdown */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/70 overflow-hidden">
        <div className="px-6 py-4 sm:px-7 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">
            {pick(detail.modulesTitle)}
          </h3>
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            {pick(detail.categoryLabel)}
          </span>
        </div>

        <div
          className={cn(
            "grid divide-y divide-white/[0.07]",
            detail.modules.length === 3
              ? "grid-cols-1 md:grid-cols-3 md:divide-y-0 md:divide-x"
              : "grid-cols-1 md:grid-cols-2"
          )}
        >
          {detail.modules.map((mod, idx) => (
            <div
              key={mod.number}
              className={cn(
                "px-6 py-4 sm:px-7 sm:py-5 flex items-start gap-4",
                detail.modules.length > 3 && idx % 2 === 1 && "md:border-l md:border-white/[0.07]"
              )}
            >
              <span className="font-mono text-xs font-black text-[#e32f8c] pt-0.5 shrink-0">
                {mod.number}
              </span>
              <div className="min-w-0 space-y-1">
                <h4 className="text-sm font-bold text-white leading-snug">
                  {pick(mod.title)}
                </h4>
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                  {pick(mod.summary)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ProgramDetailsSectionProps {
  detail?: ProgramRichDetail | null;
  standaloneTabs?: boolean;
  locale: string;
}

export function ProgramDetailsSection({
  detail,
  standaloneTabs = false,
  locale: rawLocale,
}: ProgramDetailsSectionProps) {
  const locale: "ro" | "en" = rawLocale === "en" ? "en" : "ro";
  const isRo = locale === "ro";
  const [activeTab, setActiveTab] = useState<ProgramDetailKey>("food-plan");

  if (!standaloneTabs && !detail) {
    return null;
  }

  const activeDetail = standaloneTabs
    ? PROGRAM_RICH_DETAILS[activeTab]
    : (detail as ProgramRichDetail);

  return (
    <section
      id="program-breakdown"
      className={cn(
        "relative z-10 w-full",
        standaloneTabs ? "py-10 md:py-14" : "py-8 md:py-12"
      )}
    >
      <div className="container mx-auto px-4 md:px-8 max-w-5xl">
        <div className="mb-6 sm:mb-8">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#e32f8c] block mb-1.5">
            {isRo ? "Specificații Program" : "Program Breakdown"}
          </span>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white font-[family-name:var(--font-oswald)]">
            {standaloneTabs
              ? isRo
                ? "Ce conține fiecare ghid"
                : "Inside each guide"
              : isRo
                ? "Ce conține și cui i se potrivește"
                : "What is inside & who it is for"}
          </h2>
        </div>

        {standaloneTabs && (
          <div className="inline-flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-zinc-900/80 border border-white/10 mb-6">
            {ORDERED_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer active:scale-[0.98]",
                    isActive
                      ? "bg-[#e32f8c] text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {isRo ? tab.labelRo : tab.labelEn}
                </button>
              );
            })}
          </div>
        )}

        <ProgramDetailPanel
          detail={activeDetail}
          locale={locale}
          isStandaloneOverview={standaloneTabs}
        />
      </div>
    </section>
  );
}
