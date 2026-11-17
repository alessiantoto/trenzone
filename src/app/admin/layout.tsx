import "../globals.css";
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { AdminMenuButton } from './components/AdminMenuButton';
import { ClearCacheButton } from './components/ClearCacheButton';
import { EliteFrame } from './components/EliteFrame';
import { AdminShellProvider } from './components/AdminShellContext';
import { isAdminAuthorized } from '@/app/actions/admin-auth';
import { ADMIN_NAV_GROUPS, findActiveAdminNav } from '@/lib/admin-navigation';
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
  // Verify admin session via SSR
  const isAuthorized = await isAdminAuthorized();
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';
  const isLoginPage = pathname === '/admin/login';

  if (!isAuthorized && !isLoginPage) {
    redirect(`/admin/login`);
  }

  const activeNav = findActiveAdminNav(pathname);

  // Receiving messages for admin (fixed to RO for the console)
  let messages;
  try {
    messages = (await import(`../../../messages/ro.json`)).default;
  } catch {
    messages = {};
  }

  return (
    <html lang="ro" className={`${inter.variable} ${oswald.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="h-full bg-[#f4f6f8] text-slate-900 font-sans selection:bg-[#e32f8c]/30 overflow-hidden">
        <NextIntlClientProvider messages={messages} locale="ro">
          <AdminShellProvider>
            {isLoginPage ? (
              <div className="min-h-screen">
                {children}
              </div>
            ) : (
              <div className="flex h-dvh w-full overflow-hidden relative">
                {/* Unified Sidebar & Mobile Drawer */}
                <EliteFrame navGroups={ADMIN_NAV_GROUPS} />

                {/* Main Viewport */}
                <main className="flex flex-col flex-1 min-w-0 h-full overflow-hidden relative">
                  {/* Top Command Bar */}
                  <header className="h-16 border-b border-slate-200 bg-white/90 backdrop-blur-xl flex items-center justify-between gap-2 px-3.5 sm:px-6 shrink-0 z-10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AdminMenuButton />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] sm:text-[12px] font-black uppercase tracking-widest text-slate-900 truncate leading-tight">
                          {activeNav ? activeNav.item.name : 'Admin Console'}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate leading-tight mt-0.5">
                          {activeNav ? `${activeNav.group.label} · TrenZone` : 'TrenZone Control'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <ClearCacheButton variant="header" />
                    </div>
                  </header>

                  {/* Scrollable Content Area */}
                  <div className="flex-1 overflow-y-auto overflow-x-clip p-4 sm:p-6 lg:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] custom-scrollbar bg-[#f4f6f8] relative">
                    <div className="max-w-7xl mx-auto">
                      {children}
                    </div>
                  </div>
                </main>
              </div>
            )}
          </AdminShellProvider>
        </NextIntlClientProvider>
        <Toaster
          position="bottom-right"
          containerClassName="!bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        />
      </body>
    </html>
  );
}
