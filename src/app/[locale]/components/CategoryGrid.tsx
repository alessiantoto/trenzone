"use client";

import { getOptimizedImageUrl } from '@/lib/utils/imageProxy';
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

export function CategoryGrid() {
  const params = useParams();
  const isRo = params.locale === "ro";



  const bottomCategories = [
    {
      id: "wrist-wraps",
      title: isRo ? "FAȘE" : "WRAPS",
      link: "/shop",
      image: "/images/products/wraps.png",
      tag: isRo ? "NOU" : "NEW IN",
      grayscale: false,
    },
    {
      id: "bundles",
      title: isRo ? "PACHETE PROMOȚIONALE" : "PROMO BUNDLES",
      link: "/product/pachet-maieu-jeleuri",
      image: "/images/lifestyle/maieu_si_jeleuri.png",
      tag: isRo ? "NOU" : "NEW IN",
      grayscale: false,
    }
  ];

  const shopNowText = isRo ? "CUMPĂRĂ ACUM" : "SHOP NOW";
  const jeleuriTag = isRo ? "POPULAR" : "BEST SELLER";

  return (
    <section className="w-full h-[calc(100vh-64px)] md:h-[85vh] min-h-[500px] bg-black py-2">
      <div className="h-full w-full max-w-[1600px] mx-auto px-2 flex flex-col md:flex-row gap-2">
        
        {/* MAIN BIG ITEM (60% Height mobile, 60% Width PC) */}
        <Link href="/shop" className="w-full h-[60%] md:w-[60%] md:h-full block">
          <div className="relative w-full h-full overflow-hidden group cursor-pointer bg-zinc-900 rounded-sm">
            <Image
              src="/images/lifestyle/reclama_fata.png"
              alt={isRo ? "Jeleuri Valhalla" : "Valhalla Gummies"}
              fill
              sizes="(max-width: 768px) 100vw, 60vw"
              className="absolute inset-0 object-cover group-hover:scale-105 transition-transform duration-700 ease-out z-0"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 md:pb-12 z-20 px-2 text-center pointer-events-none">
              <h2 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black uppercase text-white tracking-tighter mb-2 md:mb-4 drop-shadow-2xl">
                {isRo ? "JELEURI VALHALLA" : "VALHALLA GUMMIES"}
              </h2>
              <span className="text-white font-bold uppercase text-[10px] md:text-sm tracking-widest relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-white after:scale-x-100 group-hover:after:scale-x-0 after:origin-center after:transition-transform after:duration-300 pointer-events-auto">
                {shopNowText}
              </span>
            </div>
          </div>
        </Link>

        {/* SIDE COLUMN (40% Height mobile, 40% Width PC, Split 50/50) */}
        <div className="w-full h-[40%] md:w-[40%] md:h-full flex md:flex-col gap-2">
          {bottomCategories.map((cat, index) => (
            <Link href={cat.link} key={cat.id} className="w-1/2 h-full md:w-full md:h-1/2 block">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 + (index * 0.1) }}
                className="relative w-full h-full overflow-hidden group cursor-pointer bg-zinc-900 rounded-sm"
              >
                {/* Removed tag */}
                <Image 
                  src={getOptimizedImageUrl(cat.image) || '/placeholder.png'} 
                  alt={cat.title} 
                  fill
                  sizes="(max-width: 768px) 50vw, 40vw"
                  className={`${cat.id === 'bundles' ? 'object-contain scale-[1.3] md:scale-[1.15] object-top pt-6 md:pt-10' : 'object-cover md:object-[center_30%]'} opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-transform duration-700 ease-out ${cat.grayscale ? 'grayscale contrast-125' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-6 md:pb-12 z-20 px-1 text-center">
                  <h2 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black uppercase text-white tracking-tighter mb-1 md:mb-4 drop-shadow-2xl leading-none px-1 break-words w-full">
                    {cat.title}
                  </h2>
                  <span className="text-white font-bold uppercase text-[9px] md:text-sm tracking-widest relative after:content-[''] after:absolute after:bottom-[-4px] after:left-0 after:w-full after:h-[2px] after:bg-white after:scale-x-100 group-hover:after:scale-x-0 after:origin-center after:transition-transform after:duration-300">
                    {shopNowText}
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
