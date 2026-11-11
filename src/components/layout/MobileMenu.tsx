"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { X, ChevronRight } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { useRef } from "react";
import { RegionSwitcher } from "./RegionSwitcher";
import { getCdnUrl } from "@/lib/utils/cdn";

interface MobileMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileMenu({ isOpen, onOpenChange }: MobileMenuProps) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { label: t('home', { defaultValue: 'ACASĂ' }), href: "/" },
    { label: t('shop', { defaultValue: 'MAGAZIN' }), href: "/shop" },
    { label: t('affiliate', { defaultValue: 'Afiliere' }), href: "/affiliate" },
    { label: t('about', { defaultValue: 'DESPRE NOI' }), href: "/about" },
    { label: t('contact', { defaultValue: 'CONTACT' }), href: "/contact" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        className="w-full sm:max-w-[400px] bg-white border-none p-0 flex flex-col text-black overflow-hidden [&>button]:hidden shadow-2xl"
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between p-6 pb-2">
           <Link href="/" onClick={() => onOpenChange(false)} className="group flex items-center gap-2.5">
             <Image
               src={getCdnUrl("/images/logos/trenzone_logo.webp")}
               alt="TrenZone Emblem"
               width={32}
               height={32}
               className="w-7 h-7 object-contain drop-shadow-[0_0_8px_rgba(227,47,140,0.4)]"
             />
             <span className="text-2xl font-black italic tracking-tighter text-black">
               TREN<span className="text-[#e32f8c]">ZONE</span>
             </span>
           </Link>

           {/* Close Button on the right */}
           <button
             onClick={() => onOpenChange(false)}
             className="w-10 h-10 flex items-center justify-center text-black hover:bg-zinc-100 rounded-full transition-colors outline-none"
             aria-label={locale === 'ro' ? "Închide meniul" : "Close menu"}
           >
             <X className="w-6 h-6" strokeWidth={2} />
           </button>
        </div>

        {/* Menu Links */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col" style={{ scrollBehavior: 'smooth' }}>
          <nav className="flex flex-col px-6 pt-6 pb-4">
            {menuItems.map((item, idx) => {
              // Highlight the shop explicitly, but use a dot to show the actual active route
              const isShop = item.href === "/shop";
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <div key={item.href}>
                  <Link 
                    href={item.href as any} 
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenChange(false);
                      if (pathname !== item.href && pathname !== item.href + '/') {
                        setTimeout(() => {
                          router.push(item.href as any);
                        }, 300);
                      }
                    }}
                    className="group flex items-center justify-between py-4 border-b border-zinc-100/0 hover:border-zinc-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <span className="w-4 flex-shrink-0 flex items-center justify-start">
                         {isActive && <span className="w-2 h-2 rounded-full bg-[#e32f8c]"></span>}
                      </span>
                      <span className={`text-[27px] sm:text-[34px] font-black uppercase tracking-tighter leading-none transition-colors ${
                        isShop ? "text-[#e32f8c]" : "text-black group-hover:text-zinc-600"
                      }`}>
                        {item.label}
                      </span>
                    </div>
                    <ChevronRight className={`w-6 h-6 transition-colors ${isActive ? 'text-[#e32f8c]' : 'text-zinc-300 group-hover:text-black'}`} strokeWidth={2.5} />
                  </Link>
                </div>
              );
            })}
          </nav>





          {/* Action Links (Bottom) */}
          <div className="mt-8 flex flex-col border-t border-zinc-100">

             
             {/* Region Switcher Integration */}
             <div className="p-6 bg-zinc-50 border-t border-zinc-100">
                <RegionSwitcher
                  variant="light"
                  scrollContainerRef={scrollContainerRef as any}
                />
             </div>
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
