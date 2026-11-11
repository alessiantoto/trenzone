"use client";

import { motion } from "framer-motion";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { ArrowRight, Newspaper } from "lucide-react";
import { useLocale } from "next-intl";
import { blogPosts, BlogPost } from "@/lib/data/blog";
import { useState } from "react";
import { ArticleModal } from "./ArticleModal";

export function NewsSection() {
  const locale = useLocale();
  const isRo = locale === 'ro';
  const [selectedArticle, setSelectedArticle] = useState<BlogPost | null>(null);

  // Display only the first 3 posts on the homepage
  const recentPosts = blogPosts.slice(0, 3);

  return (
    <section className="pt-12 md:pt-16 pb-16 md:pb-24 relative overflow-hidden" id="news">
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 md:mb-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[#e32f8c] text-sm font-bold tracking-widest uppercase mb-6 backdrop-blur-md"
            >
              <Newspaper className="w-4 h-4" />
              {isRo ? "Jurnalul TrenZone" : "TrenZone Journal"}
            </motion.div>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-black uppercase text-white tracking-tighter leading-[0.9]"
            >
              {isRo ? "Ultimul" : "Latest"} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] to-purple-500">
                {isRo ? "Articol." : "News."}
              </span>
            </motion.h2>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link 
              href="/blog"
              className="inline-flex items-center gap-2 text-white/70 font-bold tracking-widest uppercase hover:text-[#e32f8c] transition-colors group"
            >
              {isRo ? "Toate Articolele" : "All Articles"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {recentPosts.map((post, index) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer flex flex-col"
            >
              <div 
                onClick={() => setSelectedArticle(post)}
                className="flex flex-col h-full"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-white/5 border border-white/10 shadow-sm">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Overlay Gradient (soft white for fresh look) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Read time badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-white tracking-widest uppercase">
                    {post.readTime}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-[#e32f8c] uppercase mb-4">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                    <span className="text-white/40">{post.author}</span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-4 group-hover:text-[#e32f8c] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-white/50 font-medium leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="mt-auto flex items-center gap-2 text-white/70 font-bold tracking-widest uppercase text-sm group-hover:text-[#e32f8c] transition-colors">
                    {isRo ? "Citește" : "Read More"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

      </div>

      <ArticleModal 
        article={selectedArticle} 
        onClose={() => setSelectedArticle(null)} 
        isRo={isRo} 
      />
    </section>
  );
}
