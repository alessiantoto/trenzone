"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Search, X } from 'lucide-react';

export interface ModernSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string | number;
  icon?: React.ReactNode;
  flag?: string;
  keywords?: string;
  disabled?: boolean;
}

export interface ModernSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ModernSelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  leadingIcon?: React.ReactNode;
  prefixLabel?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  isActive?: boolean;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  align?: 'left' | 'right' | 'auto';
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export function ModernSelect({
  value,
  onChange,
  options,
  placeholder = 'Selectează...',
  ariaLabel,
  leadingIcon,
  prefixLabel,
  searchable,
  searchPlaceholder = 'Caută...',
  emptyText = 'Niciun rezultat găsit',
  isActive,
  className = '',
  triggerClassName = '',
  panelClassName = '',
  align = 'auto',
  size = 'sm',
  disabled = false,
}: ModernSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelAlign, setPanelAlign] = useState<'left' | 'right'>('left');
  const [openUpward, setOpenUpward] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || null,
    [options, value]
  );

  const isFiltered =
    typeof isActive === 'boolean'
      ? isActive
      : Boolean(value && value !== 'all');

  const showSearch =
    typeof searchable === 'boolean' ? searchable : options.length >= 10;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => {
      const hay = [opt.label, opt.sublabel, opt.value, opt.keywords]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  const computePanelPlacement = useCallback(() => {
    const triggerEl = triggerRef.current;
    if (!triggerEl || typeof window === 'undefined') return;
    const rect = triggerEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setOpenUpward(spaceBelow < 260 && spaceAbove > spaceBelow);

    if (align === 'right') {
      setPanelAlign('right');
    } else if (align === 'left') {
      setPanelAlign('left');
    } else {
      const estimatedPanelWidth = Math.max(rect.width, 250);
      const overflowsRight = rect.left + estimatedPanelWidth > window.innerWidth - 12;
      const fitsFromRight = rect.right - estimatedPanelWidth >= 12;
      setPanelAlign(overflowsRight && fitsFromRight ? 'right' : 'left');
    }
  }, [align]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlightedIdx(-1);
      return;
    }

    computePanelPlacement();

    if (
      showSearch &&
      typeof window !== 'undefined' &&
      window.matchMedia('(pointer: fine)').matches
    ) {
      const timer = window.setTimeout(() => {
        searchInputRef.current?.focus();
      }, 20);
      return () => window.clearTimeout(timer);
    }
  }, [open, computePanelPlacement, showSearch]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleResizeOrScroll = () => {
      computePanelPlacement();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResizeOrScroll);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResizeOrScroll);
    };
  }, [open, computePanelPlacement]);

  const handleSelect = (opt: ModernSelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        filteredOptions.length === 0 ? -1 : (prev + 1) % filteredOptions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIdx((prev) =>
        filteredOptions.length === 0
          ? -1
          : (prev - 1 + filteredOptions.length) % filteredOptions.length
      );
    } else if (e.key === 'Enter' && highlightedIdx >= 0) {
      const target = filteredOptions[highlightedIdx];
      if (target && !target.disabled) {
        e.preventDefault();
        handleSelect(target);
      }
    }
  };

  const heightCls = size === 'md' ? 'h-10 px-3.5 text-xs' : 'h-9 px-3 text-xs';

  return (
    <div
      ref={containerRef}
      onKeyDown={handleContainerKeyDown}
      className={`relative inline-block ${className}`}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full inline-flex items-center justify-between gap-2 rounded-xl border font-bold transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed ${heightCls} ${
          open
            ? 'border-[#e32f8c] bg-white text-slate-900 ring-2 ring-[#e32f8c]/25 shadow-xs'
            : isFiltered
              ? 'border-[#e32f8c]/60 bg-pink-50/45 text-slate-900 ring-1 ring-[#e32f8c]/20 hover:bg-pink-50/70'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80'
        } ${triggerClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left">
          {selectedOption?.flag ? (
            <span className="text-sm leading-none shrink-0" aria-hidden="true">
              {selectedOption.flag}
            </span>
          ) : selectedOption?.icon ? (
            <span className="shrink-0 text-slate-500">{selectedOption.icon}</span>
          ) : leadingIcon ? (
            <span
              className={`shrink-0 ${
                isFiltered || open ? 'text-[#e32f8c]' : 'text-slate-400'
              }`}
            >
              {leadingIcon}
            </span>
          ) : null}

          <span className="truncate">
            {prefixLabel && isFiltered && selectedOption ? (
              <>
                <span className="text-slate-400 font-semibold mr-1">
                  {prefixLabel}
                </span>
                <span>{selectedOption.label}</span>
              </>
            ) : selectedOption ? (
              selectedOption.label
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
        </span>

        <span className="flex items-center gap-1.5 shrink-0">
          {selectedOption?.badge !== undefined && selectedOption.badge !== '' && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums leading-none ${
                isFiltered
                  ? 'bg-[#e32f8c]/15 text-[#c92077]'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {selectedOption.badge}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 shrink-0 ${
              open ? 'rotate-180 text-[#e32f8c]' : 'text-slate-400'
            }`}
          />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            className={`absolute z-50 min-w-full sm:min-w-[240px] max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200/95 rounded-2xl shadow-xl shadow-slate-900/12 overflow-hidden ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } ${panelAlign === 'right' ? 'right-0' : 'left-0'} ${panelClassName}`}
          >
            {showSearch && (
              <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                <div className="relative flex items-center">
                  <Search
                    size={13}
                    className="absolute left-2.5 text-slate-400 pointer-events-none"
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setHighlightedIdx(0);
                    }}
                    placeholder={searchPlaceholder}
                    className="w-full h-8 pl-8 pr-7 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#e32f8c] focus:ring-2 focus:ring-[#e32f8c]/20"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      aria-label="Șterge căutarea"
                      className="absolute right-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div
              id={listboxId}
              role="listbox"
              aria-label={ariaLabel}
              className="max-h-[min(280px,45vh)] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const selected = opt.value === value;
                  const highlighted = idx === highlightedIdx;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={opt.disabled}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                        selected
                          ? 'bg-pink-50/90 text-[#c92077] font-black'
                          : highlighted
                            ? 'bg-slate-100/90 text-slate-900 font-bold'
                            : 'text-slate-700 font-semibold hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0 flex-1">
                        {opt.flag && (
                          <span className="text-sm leading-none shrink-0" aria-hidden="true">
                            {opt.flag}
                          </span>
                        )}
                        {opt.icon && (
                          <span className="shrink-0 text-slate-400">{opt.icon}</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{opt.label}</span>
                          {opt.sublabel && (
                            <span className="block text-[10px] font-medium text-slate-400 truncate">
                              {opt.sublabel}
                            </span>
                          )}
                        </span>
                      </span>

                      <span className="flex items-center gap-1.5 shrink-0">
                        {opt.badge !== undefined && opt.badge !== '' && (
                          <span
                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums leading-none ${
                              selected
                                ? 'bg-[#e32f8c]/15 text-[#c92077]'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                        {selected && (
                          <Check size={14} className="text-[#e32f8c] shrink-0" />
                        )}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="py-6 px-3 text-center text-xs font-medium text-slate-400">
                  {emptyText}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
