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
    { label: t('programs', { defaultValue: 'PROGRAME' }), href: "/programs" },
    { label: t('affiliate', { defaultValue: 'Afiliere' }), href: "/affiliate" },
    { label: t('about', { defaultValue: 'DESPRE NOI' }), href: "/about" },
    { label: t('contact', { defaultValue: 'CONTACT' }), href: "/contact" },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent 
        side="left" 
        showCloseButton={false}
        className="data-[side=left]:w-[86vw] data-[side=left]:sm:max-w-[390px] bg-white border-none p-0 flex flex-col text-black overflow-hidden shadow-2xl"
      >
        {/* Modern Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-zinc-100/80">
           <Link href="/" onClick={() => onOpenChange(false)} className="group flex items-center gap-2.5 outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 active:scale-[0.98] transition-all">
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
             type="button"
             onClick={() => onOpenChange(false)}
             className="w-9 h-9 flex items-center justify-center text-black hover:bg-zinc-100 rounded-full transition-all active:scale-[0.98] outline-none cursor-pointer"
             aria-label={locale === 'ro' ? "Închide meniul" : "Close menu"}
           >
             <X className="w-5 h-5" strokeWidth={2.25} />
           </button>
        </div>

        {/* Menu Links */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto no-scrollbar flex flex-col justify-between" style={{ scrollBehavior: 'smooth' }}>
          <nav className="flex flex-col px-6 pt-4 pb-2">
            {menuItems.map((item) => {
              const isShop = item.href === "/shop";
              const isPrograms = item.href === "/programs";
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <div key={item.href}>
                  <Link 
                    href={item.href as any} 
                    onClick={(e) => {
                      e.preventDefault();
                      onOpenChange(false);
                      if (pathname !== item.href && pathname !== item.href + '/') {
                        router.push(item.href as any);
                      }
                    }}
                    className="group flex items-center justify-between py-4 border-b border-zinc-100/80 last:border-b-0 transition-all active:scale-[0.98] outline-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {isActive && (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-[#e32f8c]" />
                      )}
                      <span className={`text-[27px] sm:text-[31px] font-black uppercase tracking-tight leading-none transition-colors ${
                        isShop
                          ? "text-[#e32f8c]"
                          : "text-black group-hover:text-zinc-600"
                      }`}>
                        {item.label}
                      </span>
                      {isPrograms && (
                        <span className="bg-black text-white text-[11px] font-black px-2 py-0.5 rounded-full tracking-wide shrink-0">
                          -27%
                        </span>
                      )}
                    </div>
                    <ChevronRight className={`w-6 h-6 shrink-0 transition-colors ${
                      isShop ? 'text-[#e32f8c]' : isActive ? 'text-[#e32f8c]' : 'text-zinc-300 group-hover:text-black'
                    }`} strokeWidth={2.5} />
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Integrated Region & Language Controls */}
          <div className="mt-4 px-6 pt-4 pb-6 bg-[#f6f6f8] border-t border-zinc-200/80">
            <RegionSwitcher
              variant="light"
              inline={true}
              scrollContainerRef={scrollContainerRef as any}
            />
          </div>
        </div>

      </SheetContent>
    </Sheet>
  );
}
