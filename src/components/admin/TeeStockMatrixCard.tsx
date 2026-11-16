'use client';

import { useState, useEffect } from 'react';
import { Package, Save, CheckCircle2, Info, RotateCcw } from 'lucide-react';
import {
  TEE_STOCK_SIZES,
  DEFAULT_TEE_MODELS,
  buildDefaultTeeStockMatrix,
  computeTotalVariantStock,
  type VariantStockMatrix,
} from '@/lib/variant-stock';

interface TeeStockMatrixCardProps {
  productName?: string;
  initialMatrix?: VariantStockMatrix | null;
  initialSold?: VariantStockMatrix | null;
  models?: string[];
  saving?: boolean;
  onSave?: (matrix: VariantStockMatrix, totalStock: number) => Promise<void> | void;
  onLiveChange?: (matrix: VariantStockMatrix, totalStock: number) => void;
  compactHeader?: boolean;
}

export function TeeStockMatrixCard({
  productName = 'TREN Oversized Tee',
  initialMatrix,
  initialSold,
  models,
  saving = false,
  onSave,
  onLiveChange,
  compactHeader = false,
}: TeeStockMatrixCardProps) {
  const resolvedModels =
    models && models.length > 0
      ? models
      : initialMatrix && Object.keys(initialMatrix).length > 0
        ? Object.keys(initialMatrix)
        : [...DEFAULT_TEE_MODELS];

  const normalizeMatrix = (source?: VariantStockMatrix | null): VariantStockMatrix => {
    const base = buildDefaultTeeStockMatrix(resolvedModels);
    if (!source || typeof source !== 'object') return base;
    for (const model of resolvedModels) {
      if (source[model] && typeof source[model] === 'object') {
        const mergedSizes: Record<string, number> = {};
        for (const sz of TEE_STOCK_SIZES) {
          const val = source[model][sz];
          mergedSizes[sz] = val !== undefined && val !== null ? Math.max(0, Math.round(Number(val) || 0)) : base[model][sz];
        }
        base[model] = mergedSizes;
      }
    }
    return base;
  };

  const [matrix, setMatrix] = useState<VariantStockMatrix>(() => normalizeMatrix(initialMatrix));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setMatrix(normalizeMatrix(initialMatrix));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initialMatrix), resolvedModels.join('|')]);

  const handleQtyChange = (model: string, size: string, rawVal: string) => {
    const parsed = Math.max(0, parseInt(rawVal || '0', 10) || 0);
    const next: VariantStockMatrix = {
      ...matrix,
      [model]: {
        ...(matrix[model] || {}),
        [size]: parsed,
      },
    };
    setMatrix(next);
    setDirty(true);
    onLiveChange?.(next, computeTotalVariantStock(next));
  };

  const handleResetDefaults = () => {
    const def = buildDefaultTeeStockMatrix(resolvedModels);
    setMatrix(def);
    setDirty(true);
    onLiveChange?.(def, computeTotalVariantStock(def));
  };

  const grandTotal = computeTotalVariantStock(matrix);
  const totalSold = computeTotalVariantStock(initialSold);

  const getCellStyle = (qty: number) => {
    if (qty <= 0) return 'border-red-300 bg-red-50 text-red-700';
    if (qty <= 3) return 'border-amber-300 bg-amber-50 text-amber-800';
    return 'border-slate-200 bg-white text-slate-900 focus:border-[#e32f8c]';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#e32f8c]/10 text-[#e32f8c] flex items-center justify-center shrink-0">
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={compactHeader ? 'text-sm font-black text-slate-900' : 'text-base sm:text-lg font-black text-slate-900'}>
                Inventar pe Modele și Mărimi — {productName}
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 size={11} />
                {grandTotal} buc. rămase
              </span>
              {totalSold > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                  {totalSold} vândute
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Info size={13} className="text-[#e32f8c] shrink-0" />
              <span>
                Scade automat la fiecare comandă. Dacă o mărime ajunge la <strong>0</strong>, vânzările pe site nu se blochează (doar tracking intern).
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="h-9 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Resetează la lotul inițial (50 buc./model)"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Lot 50/model</span>
          </button>

          {onSave && (
            <button
              type="button"
              onClick={async () => {
                await onSave(matrix, grandTotal);
                setDirty(false);
              }}
              disabled={saving}
              className={`h-9 px-4 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                dirty
                  ? 'bg-[#e32f8c] hover:bg-[#c41a72] text-white shadow-[#e32f8c]/25'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Save size={14} />
              <span>{saving ? 'Se salvează...' : dirty ? 'Salvează Stoc' : 'Salvează'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Matrix Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              <th className="px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-500">Model Tricou</th>
              {TEE_STOCK_SIZES.map((sz) => (
                <th key={sz} className="px-3 py-3 text-center text-[11px] font-black uppercase tracking-wider text-slate-600">
                  {sz}
                </th>
              ))}
              <th className="px-5 py-3 text-right text-[11px] font-black uppercase tracking-wider text-slate-500">Total Model</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {resolvedModels.map((model) => {
              const row = matrix[model] || {};
              const rowTotal = TEE_STOCK_SIZES.reduce((sum, sz) => sum + (Number(row[sz]) || 0), 0);
              const rowSold = TEE_STOCK_SIZES.reduce((sum, sz) => sum + (Number(initialSold?.[model]?.[sz]) || 0), 0);

              return (
                <tr key={model} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{model}</span>
                      {rowSold > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">Vândute total: {rowSold} buc.</span>
                      )}
                    </div>
                  </td>
                  {TEE_STOCK_SIZES.map((sz) => {
                    const qty = Number(row[sz]) ?? 0;
                    const sold = Number(initialSold?.[model]?.[sz]) || 0;
                    return (
                      <td key={sz} className="px-3 py-3 text-center">
                        <div className="inline-flex flex-col items-center gap-0.5">
                          <input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={(e) => handleQtyChange(model, sz, e.target.value)}
                            className={`w-16 h-9 text-center rounded-xl border text-sm font-black font-mono focus:outline-none transition-colors ${getCellStyle(qty)}`}
                          />
                          {sold > 0 && (
                            <span className="text-[9px] font-bold text-slate-400">-{sold} vând.</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-5 py-3.5 text-right">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                      rowTotal === 0 ? 'bg-red-100 text-red-700' : rowTotal <= 10 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                    }`}>
                      {rowTotal} buc.
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/90 border-t border-slate-200">
              <td className="px-5 py-3 text-xs font-black uppercase text-slate-500">Total pe Mărime</td>
              {TEE_STOCK_SIZES.map((sz) => {
                const colTotal = resolvedModels.reduce((sum, m) => sum + (Number(matrix[m]?.[sz]) || 0), 0);
                return (
                  <td key={sz} className="px-3 py-3 text-center text-xs font-black text-slate-700 font-mono">
                    {colTotal}
                  </td>
                );
              })}
              <td className="px-5 py-3 text-right text-sm font-black text-[#e32f8c] font-mono">
                {grandTotal} buc.
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile View (Compact Cards) */}
      <div className="md:hidden divide-y divide-slate-100">
        {resolvedModels.map((model) => {
          const row = matrix[model] || {};
          const rowTotal = TEE_STOCK_SIZES.reduce((sum, sz) => sum + (Number(row[sz]) || 0), 0);
          return (
            <div key={model} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{model}</span>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                  rowTotal === 0 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-800'
                }`}>
                  {rowTotal} buc.
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {TEE_STOCK_SIZES.map((sz) => {
                  const qty = Number(row[sz]) ?? 0;
                  const sold = Number(initialSold?.[model]?.[sz]) || 0;
                  return (
                    <div key={sz} className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-black text-slate-500">{sz}</span>
                      <input
                        type="number"
                        min={0}
                        value={qty}
                        onChange={(e) => handleQtyChange(model, sz, e.target.value)}
                        className={`w-full h-9 text-center rounded-xl border text-xs font-black font-mono focus:outline-none ${getCellStyle(qty)}`}
                      />
                      {sold > 0 && <span className="text-[9px] text-slate-400">-{sold}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

