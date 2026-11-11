import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Universal helper to extract localized strings from JSONB fields or plain strings.
 * Prioritizes the current locale, then falls back to 'ro', then an empty string.
 */
export function getLocalized(field: any, locale: string): string {
  if (!field) return "";
  if (typeof field === 'string') return field;
  if (typeof field === 'object') {
    return field[locale] || field['ro'] || "";
  }
  return String(field);
}

const COLOR_MAP: Record<string, string> = {
  "PEPENE ROȘU": "bg-rose-500",
  "PEPENE ROSU": "bg-rose-500",
  "WATERMELON": "bg-rose-500",
  "LEMON & LIME": "bg-[#a6ce39]",
  "LĂMÂIE ȘI LIME": "bg-[#a6ce39]",
  "LAMAIE SI LIME": "bg-[#a6ce39]",
  "FRUCTE DE PĂDURE": "bg-purple-600",
  "FRUCTE DE PADURE": "bg-purple-600",
  "FOREST FRUITS": "bg-purple-600",
  "CĂPȘUNI DULCI": "bg-red-600",
  "CAPSUNI DULCI": "bg-red-600",
  "CĂPȘUNI": "bg-red-600",
  "CAPSUNI": "bg-red-600",
  "SWEET STRAWBERRY": "bg-red-600",
  "STRAWBERRY": "bg-red-600",
  "EXPLOZIE DE AFINE": "bg-blue-600",
  "AFINE": "bg-blue-600",
  "BLUEBERRY BLAST": "bg-blue-600",
  "BLUEBERRY": "bg-blue-600",
  "LĂMÂIE": "bg-yellow-400",
  "LAMAIE": "bg-yellow-400",
  "LEMON": "bg-yellow-400",
  "PORTOCALĂ": "bg-orange-500",
  "PORTOCALA": "bg-orange-500",
  "ORANGE": "bg-orange-500",
  "MENTĂ": "bg-emerald-500",
  "MENTA": "bg-emerald-500",
  "MINT": "bg-emerald-500",
  "NEGRU": "bg-zinc-900",
  "BLACK": "bg-zinc-900",
  "ALB": "bg-zinc-100",
  "WHITE": "bg-zinc-100",
  "DEFAULT": "bg-zinc-800",
};

export function getVariantColorClass(name: string): string {
  if (!name) return COLOR_MAP["DEFAULT"];
  const upper = name.toUpperCase().trim();
  if (COLOR_MAP[upper]) return COLOR_MAP[upper];
  const n = name.toLowerCase();
  if (n.includes('afine') || n.includes('blue')) return 'bg-blue-600';
  if (n.includes('căpșuni') || n.includes('capsuni') || n.includes('straw')) return 'bg-red-600';
  if (n.includes('lămâie') || n.includes('lamaie') || n.includes('lemon')) return 'bg-[#a6ce39]';
  if (n.includes('lime') || n.includes('măr') || n.includes('mar') || n.includes('verde')) return 'bg-[#a6ce39]';
  if (n.includes('pădure') || n.includes('padure') || n.includes('berry')) return 'bg-purple-600';
  if (n.includes('pepene') || n.includes('watermelon') || n.includes('roșu') || n.includes('rosu')) return 'bg-rose-500';
  if (n.includes('mentă') || n.includes('menta') || n.includes('mint')) return 'bg-emerald-500';
  if (n.includes('portocală') || n.includes('portocala') || n.includes('orange')) return 'bg-orange-500';
  return COLOR_MAP["DEFAULT"];
}
