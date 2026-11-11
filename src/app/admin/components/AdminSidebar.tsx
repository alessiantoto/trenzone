"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAdminShell } from './AdminShellContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Mail, 
  Settings, 
  LogOut,
  Zap,
  Ticket,
  FileText,
  Clock
} from 'lucide-react';

export function AdminSidebar() {
  const { isSidebarOpen, setSidebarOpen } = useAdminShell();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Comenzi', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
    { name: 'Precomenzi', icon: <Clock size={20} />, path: '/admin/preorders' },
    { name: 'Facturi', icon: <FileText size={20} />, path: '/admin/invoices' },
    { name: 'Email Broadcast', icon: <Mail size={20} />, path: '/admin/marketing/broadcast' },
    { name: 'Clienți', icon: <Users size={20} />, path: '/admin/customers' },
    { name: 'Cupoane', icon: <Ticket size={20} />, path: '/admin/coupons' },
    { name: 'Influenceri', icon: <Zap size={20} />, path: '/admin/influencers' },
    { name: 'Setări', icon: <Settings size={20} />, path: '/admin/settings' },
  ];

  if (!mounted) return <div className="hidden md:block w-[280px] bg-[#0c0c0c]" />;

  return (
    <>
      {/* 🛡️ MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9998] md:hidden backdrop-blur-md"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 🚀 MAIN SIDEBAR CONTENT */}
      <aside 
        style={{ width: '280px', minWidth: '280px' }}
        className={`
          flex flex-col h-full bg-[#0c0c0c] border-r border-white/10 z-[9999]
          fixed md:relative top-0 left-0 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-8 border-b border-white/5">
          <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
             <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-white/10 p-1">
                <Image 
                  src="/images/vladtren-logo.png" 
                  alt="TrenZone" 
                  width={36} 
                  height={36} 
                  className="w-8 h-8 object-contain"
                />
             </div>
             <div>
                <span className="font-black text-xl tracking-tighter text-white block leading-none">TRENZONE</span>
                <span className="text-[10px] text-[#e32f8c] font-black uppercase tracking-[0.2em] block mt-1">ADMIN</span>
             </div>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-4 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group
                  ${isActive 
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'}
                `}
              >
                <span className={isActive ? 'text-black' : 'text-orange-500/40 group-hover:text-orange-500'}>
                  {item.icon}
                </span>
                <span className={`text-sm tracking-tight ${isActive ? 'font-black uppercase' : 'font-bold'}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <div className="flex items-center gap-3 px-2">
             <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 text-[10px] font-black">AD</div>
             <div className="flex-1 overflow-hidden text-left">
                <p className="text-[10px] font-black text-white uppercase truncate">Administrator</p>
                <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">TrenZone Admin</p>
             </div>
             <Link href="/" className="text-gray-500 hover:text-white"><LogOut size={16} /></Link>
          </div>
        </div>
      </aside>
    </>
  );
}
