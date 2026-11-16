"use client";

import { cn } from "@/lib/utils";

interface LanguageFlagSvgProps {
  isEnglish: boolean;
  className?: string;
}

export function LanguageFlagSvg({
  isEnglish,
  className = "w-5 h-3.5",
}: LanguageFlagSvgProps) {
  if (isEnglish) {
    return (
      <svg
        viewBox="0 0 60 40"
        className={cn("rounded-[3px] shadow-2xs border border-black/15 shrink-0", className)}
        aria-hidden="true"
      >
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="3.5" />
        <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="11" />
        <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="6.5" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      className={cn("rounded-[3px] shadow-2xs border border-black/15 shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="8" height="16" x="0" fill="#002B7F" />
      <rect width="8" height="16" x="8" fill="#FCD116" />
      <rect width="8" height="16" x="16" fill="#CE1126" />
    </svg>
  );
}

