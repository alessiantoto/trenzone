"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAdminShell } from './AdminShellContext';
import {
  ADMIN_NAV_GROUPS,
  isAdminNavPathActive,
  type AdminNavGroup,
  type AdminNavIconKey,
} from '@/lib/admin-navigation';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Users,
  Mail,
  Settings,
  LogOut,
  Ticket,
  FileText,
  Package,
  TrendingUp,
  MessageSquare,
  Truck,
  Share2,
  Megaphone,
  Tag,
  RotateCcw,
  Star,
  Clock,
  ShoppingCart,
  BookOpen,
  X,
  type LucideIcon,
} from 'lucide-react';

const NAV_ICONS: Record<AdminNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  preorders: Clock,
  analytics: BarChart3,
  products: Package,
  programs: BookOpen,
  abandonedCarts: ShoppingCart,
  returns: RotateCcw,
  invoices: FileText,
  shipping: Truck,
  customers: Users,
  leads: MessageSquare,
  reviews: Star,
  broadcast: Megaphone,
  promo: Tag,
  coupons: Ticket,
  affiliates: TrendingUp,
  influencers: Share2,
  emails: Mail,
  settings: Settings,
};

interface EliteFrameProps {
  navGroups?: AdminNavGroup[];
}

export function EliteFrame({ navGroups = ADMIN_NAV_GROUPS }: EliteFrameProps) {
  const { isSidebarOpen, setSidebarOpen } = useAdminShell();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/75 z-[10000] md:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Unified Desktop Sidebar & Mobile Drawer */}
      <aside
        aria-label="Navigare Admin"
        className={`
          flex flex-col h-dvh bg-white border-r border-slate-200 z-[10001] md:z-30
          fixed top-0 transition-transform duration-300 ease-in-out
          w-[280px] min-w-[280px]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          left-0 md:relative md:h-full shadow-[4px_0_24px_rgba(0,0,0,0.03)]
        `}
      >
        {/* Top Brand Header */}
        <div className="shrink-0 px-4 py-4 sm:px-5 sm:py-5 border-b border-slate-100 flex items-center justify-between gap-2">
          <Link
            href="/admin"
            className="flex items-center gap-3 min-w-0"
            onClick={() => setSidebarOpen(false)}
          >
            <div className="bg-black w-10 h-10 sm:w-11 sm:h-11 rounded-[12px] flex items-center justify-center shadow-md shrink-0 overflow-hidden border border-white/10 p-1">
              <Image
                src="/images/vladtren-logo.png"
                alt="TrenZone Logo"
                width={44}
                height={44}
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="text-[15px] font-black uppercase tracking-wider text-slate-900 leading-none mb-1 font-[family-name:var(--font-oswald)] truncate">
                TRENZONE
              </span>
              <span className="text-[10px] text-[#e32f8c] font-black uppercase tracking-[0.22em] leading-none">
                ADMIN
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Închide meniul"
            className="md:hidden w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-90 shrink-0 cursor-pointer"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Scrollable Frequency-Ordered Groups */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3.5 space-y-4 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              <div className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 select-none">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isAdminNavPathActive(pathname, item.path);
                  const Icon = NAV_ICONS[item.iconKey] || LayoutDashboard;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`
                        min-h-[42px] flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-all group
                        ${
                          active
                            ? 'bg-slate-950 text-white shadow-xs font-bold'
                            : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-medium'
                        }
                      `}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <Icon
                          size={18}
                          strokeWidth={active ? 2.25 : 2}
                          className={`shrink-0 transition-colors ${
                            active
                              ? 'text-[#ff6eb6]'
                              : 'text-slate-400 group-hover:text-slate-700'
                          }`}
                        />
                        <span className="text-[13px] leading-snug truncate">
                          {item.name}
                        </span>
                      </span>
                      {active && (
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#e32f8c] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sticky Bottom Administrator Bar */}
        <div className="shrink-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-slate-200/80 bg-slate-50/90">
          <div className="flex items-center gap-3 px-1.5">
            <div className="w-8 h-8 rounded-full bg-[#e32f8c]/10 border border-[#e32f8c]/25 flex items-center justify-center text-[#e32f8c] text-[10px] font-black shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight">
                Administrator
              </p>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate leading-tight mt-0.5">
                TrenZone Admin
              </p>
            </div>
            <Link
              href="/"
              title="Înapoi la magazin"
              aria-label="Înapoi la magazin"
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
            >
              <LogOut size={16} />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
