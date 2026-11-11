"use client";

import { blogPosts, BlogPost } from "@/lib/data/blog";
import { Link } from "@/i18n/routing";
import Image from "next/image";
import { ArrowRight, Newspaper } from "lucide-react";
import { useState, use } from "react";
import { ArticleModal } from "../components/ArticleModal";

export default function BlogIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const isRo = locale === 'ro';
  const [selectedArticle, setSelectedArticle] = useState<BlogPost | null>(null);

  return (
    <div className="min-h-screen bg-white pt-32 sm:pt-36 md:pt-40 pb-24 selection:bg-[#e32f8c] selection:text-black">
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Header */}
        <div className="mb-16 md:mb-24 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 text-[#e32f8c] text-sm font-bold tracking-widest uppercase mb-6 shadow-sm backdrop-blur-md">
            <Newspaper className="w-4 h-4" />
            {isRo ? "Jurnalul TrenZone" : "TrenZone Journal"}
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase text-black tracking-tighter leading-[0.9] mb-6">
            {isRo ? "Articole & " : "Articles & "} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e32f8c] to-blue-500">
              {isRo ? "Educație" : "Education"}
            </span>
          </h1>
          <p className="text-zinc-500 font-medium text-lg md:text-xl">
            {isRo 
              ? "Descoperă secretele antrenamentelor de forță, protecția articulațiilor și cum să-ți maximizezi performanța sub bară." 
              : "Discover the secrets of heavy strength training, joint longevity, and how to maximize your performance under the bar."}
          </p>
        </div>

        {/* Blog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article 
              key={post.id}
              className="group cursor-pointer flex flex-col"
            >
              <div 
                onClick={() => setSelectedArticle(post)} 
                className="flex flex-col h-full"
              >
                {/* Image Container */}
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden mb-6 bg-zinc-50 border border-zinc-200 shadow-sm">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  {/* Read time badge */}
                  <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 backdrop-blur-md border border-zinc-200 rounded-full text-xs font-bold text-black tracking-widest uppercase shadow-sm">
                    {post.readTime}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-xs font-bold tracking-widest text-[#e32f8c] uppercase mb-4">
                    <span>{post.date}</span>
                    <span className="w-1 h-1 bg-zinc-300 rounded-full" />
                    <span className="text-zinc-500">{post.author}</span>
                  </div>
                  
                  <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-black mb-4 group-hover:text-[#e32f8c] transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-zinc-500 font-medium leading-relaxed mb-6 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <div className="mt-auto flex items-center gap-2 text-black font-bold tracking-widest uppercase text-sm group-hover:text-[#e32f8c] transition-colors">
                    {isRo ? "Citește" : "Read More"}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <ArticleModal 
          article={selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
          isRo={isRo} 
        />
      </div>
    </div>
  );
}
