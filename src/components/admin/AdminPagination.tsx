"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface AdminPaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
  label?: string;
}

export function AdminPagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  compact = false,
  label = "rezultate",
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / Math.max(1, itemsPerPage)));
  if (totalItems <= itemsPerPage || totalPages <= 1) return null;

  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const start = (safePage - 1) * itemsPerPage + 1;
  const end = Math.min(safePage * itemsPerPage, totalItems);

  const visiblePages: Array<number | "ellipsis"> = [];
  if (totalPages <= 5 || compact) {
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
      if (compact && totalPages > 5) break;
      visiblePages.push(i);
    }
  } else {
    visiblePages.push(1);
    if (safePage > 3) visiblePages.push("ellipsis");
    const from = Math.max(2, safePage - 1);
    const to = Math.min(totalPages - 1, safePage + 1);
    for (let i = from; i <= to; i++) visiblePages.push(i);
    if (safePage < totalPages - 2) visiblePages.push("ellipsis");
    visiblePages.push(totalPages);
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 ${
        compact ? "pt-3 mt-2 border-t border-slate-100" : "pt-4 mt-3 border-t border-slate-100"
      }`}
    >
      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">
        <strong className="text-slate-900">
          {start}–{end}
        </strong>{" "}
        din <strong className="text-slate-900">{totalItems.toLocaleString("ro-RO")}</strong> {label}
      </span>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="Pagina anterioară"
          className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer ${
            compact ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-xs gap-1"
          }`}
        >
          <ChevronLeft size={14} />
          {!compact && <span className="hidden sm:inline">Înapoi</span>}
        </button>

        {compact ? (
          <span className="px-2 text-[11px] font-black text-slate-700 tabular-nums">
            {safePage} / {totalPages}
          </span>
        ) : (
          visiblePages.map((p, idx) =>
            p === "ellipsis" ? (
              <span key={`el-${idx}`} className="px-1.5 text-xs text-slate-400 font-bold">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-xl text-xs font-black tabular-nums transition-all cursor-pointer ${
                  p === safePage
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                }`}
              >
                {p}
              </button>
            )
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="Pagina următoare"
          className={`inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer ${
            compact ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-xs gap-1"
          }`}
        >
          {!compact && <span className="hidden sm:inline">Înainte</span>}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

