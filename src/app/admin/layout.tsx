import "../globals.css";
import { 
  LayoutDashboard, 
  Activity,
  ShoppingBag, 
  Users, 
  Settings, 
  Package, 
  LogOut,
  Megaphone,
  Zap,
  Search,
  Plus,
  Ticket,
  FileText,
  Shield,
  Truck,
  Mail,
  ShoppingCart,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { RefreshButton } from './components/RefreshButton';
import { AdminMenuButton } from './components/AdminMenuButton';
import { ClearCacheButton } from './components/ClearCacheButton';
import { EliteFrame } from './components/EliteFrame';
import { AdminShellProvider } from './components/AdminShellContext';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import { Metadata } from 'next';
import { Inter, Oswald } from "next/font/google";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TrenZone | Admin Console",
  description: "TrenZone Management Center",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 🛡️ ELITE PROTECTION: Verify admin session via SSR
  // Thanks to @supabase/ssr and proxy.ts, the server verifies your authenticated admin session.
  const isAuthorized = await isAdminAuthorized();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isLoginPage = pathname === '/admin/login';

  if (!isAuthorized && !isLoginPage) {
    redirect(`/admin/login`);
  }

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin' },
    { name: 'Web Analytics', icon: <Activity size={20} />, path: '/admin?tab=web-analytics' },
    { name: 'Comenzi', icon: <ShoppingBag size={20} />, path: '/admin/orders' },
    { name: 'Precomenzi', icon: <Clock size={20} />, path: '/admin/preorders' },
    { name: 'Coșuri Abandonate', icon: <ShoppingCart size={20} />, path: '/admin/abandoned-carts' },
    { name: 'Facturi', icon: <FileText size={20} />, path: '/admin/invoices' },
    { name: 'Campanii', icon: <Megaphone size={20} />, path: '/admin/marketing/broadcast' },
    { name: 'Email-uri Automate', icon: <Mail size={20} />, path: '/admin/emails' },
    { name: 'Clienți Elite', icon: <Users size={20} />, path: '/admin/customers' },
    { name: 'Cupoane', icon: <Ticket size={20} />, path: '/admin/coupons' },
    { name: 'Setări', icon: <Settings size={20} />, path: '/admin/settings' },
    { name: 'Curieri & Livrare', icon: <Truck size={20} />, path: '/admin/shipping' },
  ];

  // Receiving messages for admin (fixed to RO for the console)
  let messages;
  try {
    messages = (await import(`../../../messages/ro.json`)).default;
  } catch (e) {
    messages = {};
  }

  return (
    <html lang="ro" className={`${inter.variable} ${oswald.variable} h-full antialiased`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="h-full bg-[#f4f6f8] text-slate-900 font-sans selection:bg-[#e32f8c]/30 overflow-hidden">
        <NextIntlClientProvider messages={messages} locale="ro">
          <AdminShellProvider>
            {isLoginPage ? (
              <div className="min-h-screen">
                {children}
              </div>
            ) : (
              <div className="flex h-screen w-full overflow-hidden relative">
                {/* 🚀 ELITE FRAME (NEW SIDEBAR) */}
                <EliteFrame />

                {/* 🎬 MAIN VIEWPORT */}
                <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
                  {/* TOP COMMAND BAR */}
                  <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-xl flex items-center justify-between gap-2 px-3.5 sm:px-6 shrink-0 z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AdminMenuButton />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-slate-900 truncate leading-tight">
                          Admin Console
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate sm:hidden leading-tight">
                          TrenZone Control
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <ClearCacheButton variant="header" />
                    </div>
                  </header>

                  {/* SCROLLABLE CONTENT AREA */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 custom-scrollbar bg-[#f4f6f8] relative z-20">
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </div>
                </main>
              </div>
            )}
          </AdminShellProvider>
        </NextIntlClientProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
