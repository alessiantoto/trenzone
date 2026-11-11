"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAdminShell } from './AdminShellContext';
import { 
  LayoutDashboard, 
  Activity,
  ShoppingBag, 
  Users, 
  Mail, 
  Settings, 
  LogOut,
  Ticket,
  FileText,
  Package,
  TrendingUp,
  Shield,
  MessageSquare,
  Truck,
  Zap,
  Megaphone,
  Tag,
  RefreshCw,
  Star,
  Clock,
  ShoppingCart,
  X
} from 'lucide-react';

export function EliteFrame() {
  const { isSidebarOpen, setSidebarOpen } = useAdminShell();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const items = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Web Analytics', icon: <Activity size={20} />, path: '/admin?tab=web-analytics' },
    { name: 'Comenzi', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
    { name: 'Precomenzi', icon: <Clock size={20} />, path: '/admin/preorders' },
    { name: 'Retururi', icon: <RefreshCw size={20} />, path: '/admin/returns' },
    { name: 'Coșuri Abandonate', icon: <ShoppingCart size={20} />, path: '/admin/abandoned-carts' },
    { name: 'Produse', icon: <Package size={20} />, path: '/admin/products' },
    { name: 'Clienți', icon: <Users size={20} />, path: '/admin/customers' },
    { name: 'Afiliați', icon: <TrendingUp size={20} />, path: '/admin/affiliates' },
    { name: 'Cupoane', icon: <Ticket size={20} />, path: '/admin/coupons' },
    { name: 'Curieri & Livrare', icon: <Truck size={20} />, path: '/admin/shipping' },
    { name: 'Facturi', icon: <FileText size={20} />, path: '/admin/invoices' },
    { name: 'E-mailuri Automate', icon: <Mail size={20} />, path: '/admin/emails' },
    { name: 'Campanii', icon: <Megaphone size={20} />, path: '/admin/marketing/broadcast' },
    { name: 'Promoție', icon: <Tag size={20} />, path: '/admin/marketing/promo' },
    { name: 'Leads & Contact', icon: <MessageSquare size={20} />, path: '/admin/leads' },
    { name: 'Recenzii', icon: <Star size={20} />, path: '/admin/reviews' },
    { name: 'Influenceri', icon: <Zap size={20} />, path: '/admin/influencers' },
    { name: 'Setări', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  if (!mounted) return null;

  return (
    <>
      {/* 🛡️ ELITE COVER */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/95 z-[10000] md:hidden backdrop-blur-md"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 🚀 ELITE PANEL */}
      <div 
        className={`
          flex flex-col h-screen bg-white border-r border-slate-200 z-[10001]
          fixed top-0 transition-all duration-300 ease-in-out
          w-[280px] min-w-[280px]
          ${isSidebarOpen ? 'left-0' : '-left-[280px] md:left-0'}
          md:relative md:h-full shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        `}
      >
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between gap-2">
          <Link href="/admin" className="flex items-center gap-3.5 min-w-0" onClick={() => setSidebarOpen(false)}>
             <div className="bg-black w-11 h-11 sm:w-12 sm:h-12 rounded-[14px] flex items-center justify-center shadow-lg shrink-0 overflow-hidden border border-white/10 p-1">
                <Image 
                  src="/images/vladtren-logo.png" 
                  alt="TrenZone Logo" 
                  width={48} 
                  height={48} 
                  className="w-9 h-9 sm:w-10 sm:h-10 object-contain hover:scale-110 transition-transform"
                />
             </div>
             <div className="flex flex-col justify-center min-w-0">
                <span className="text-[16px] font-black uppercase tracking-wider text-slate-900 leading-none mb-1 font-[family-name:var(--font-oswald)] truncate">
                  TRENZONE
                </span>
                <span className="text-[10px] text-[#e32f8c] font-black uppercase tracking-[0.25em] leading-none">ADMIN</span>
             </div>
          </Link>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Închide meniul"
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors active:scale-90 shrink-0 cursor-pointer"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto scrollbar-hide">
          {items.map((item) => {
            const active = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3 rounded-xl transition-all group font-medium
                  ${active 
                    ? 'bg-[#f4f6f8] text-slate-900 shadow-sm border border-slate-200/50' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}
                `}
              >
                <span className={active ? 'text-[#e32f8c]' : 'text-slate-400 group-hover:text-slate-600'}>
                  {item.icon}
                </span>
                <span className={`text-sm ${active ? 'font-bold' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2">
             <div className="w-8 h-8 rounded-full bg-[#e32f8c]/10 border border-[#e32f8c]/20 flex items-center justify-center text-[#e32f8c] text-[10px] font-black">AD</div>
             <div className="flex-1 overflow-hidden text-left">
                <p className="text-[10px] font-black text-slate-900 uppercase truncate">Administrator</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">TrenZone Admin</p>
             </div>
             <Link href="/" className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={16} /></Link>
          </div>
        </div>
      </div>
    </>
  );
}
