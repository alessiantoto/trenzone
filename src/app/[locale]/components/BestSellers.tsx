"use client";

import { useState, useEffect } from "react";
import { getProducts, Product } from "@/lib/api";
import { ProductCard } from "@/components/product/ProductCard";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";

export function BestSellers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const productsData = await getProducts();
        setProducts(productsData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="w-full bg-white py-24 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#e32f8c]" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse text-black">Încărcăm Produsele...</p>
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="w-full bg-white py-16 md:py-24 border-t border-zinc-100 relative z-20" id="best-sellers">
      <div className="container mx-auto px-4 md:px-8 max-w-[1600px]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter text-black leading-none"
            >
              PREFERATELE VOASTRE
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base font-medium text-zinc-500 mt-3"
            >
              Echipamentul de elită preferat de comunitatea noastră. Alege exact ce ai nevoie pentru a trece la următorul nivel.
            </motion.p>
          </div>
        </div>

        <div className={`grid grid-cols-2 ${products.length <= 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' : 'md:grid-cols-3 lg:grid-cols-4'} gap-3 sm:gap-5 md:gap-6`}>
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
