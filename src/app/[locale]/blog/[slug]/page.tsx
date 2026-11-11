import { notFound } from "next/navigation";
import { blogPosts } from "@/lib/data/blog";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Calendar, Clock, User } from "lucide-react";
import Image from "next/image";

export const revalidate = 2592000;

export function generateStaticParams() {
  const locales = ["ro", "en"];
  const params: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const post of blogPosts) {
      params.push({ locale, slug: post.slug });
    }
  }
  return params;
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params;
  const post = blogPosts.find((p) => p.slug === slug);

  if (!post) {
    notFound();
  }

  const isRo = locale === 'ro';

  return (
    <div className="min-h-screen bg-white pt-32 sm:pt-36 md:pt-40 pb-24 selection:bg-[#e32f8c] selection:text-black">
      <div className="container mx-auto px-4 max-w-4xl">
        
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-black transition-colors font-bold uppercase tracking-widest text-sm mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          {isRo ? "Înapoi Acasă" : "Back Home"}
        </Link>

        {/* Header Section */}
        <header className="mb-12">
          <div className="flex flex-wrap items-center gap-6 text-sm font-bold tracking-widest text-[#e32f8c] uppercase mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{post.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-zinc-500">{post.author}</span>
            </div>
            <div className="flex items-center gap-2 bg-[#e32f8c]/10 px-3 py-1 rounded-full border border-[#e32f8c]/20 text-black">
              <Clock className="w-4 h-4 text-[#e32f8c]" />
              <span>{post.readTime}</span>
            </div>
          </div>

          <h1 className="text-4xl md:text-6xl font-black uppercase text-black tracking-tighter leading-[1.1] mb-6">
            {post.title}
          </h1>

          <p className="text-xl md:text-2xl text-zinc-600 font-medium leading-relaxed">
            {post.excerpt}
          </p>
        </header>

        {/* Hero Image */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden mb-16 border border-zinc-200 bg-zinc-50 shadow-sm">
          <Image
            src={post.image}
            alt={post.title}
            fill
            sizes="(max-width: 1200px) 100vw, 1200px"
            className="object-cover"
            priority
          />
        </div>

        {/* Article Content */}
        <article className="prose prose-lg md:prose-xl max-w-none 
          prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-black
          prose-h2:text-3xl prose-h2:md:text-4xl prose-h2:mt-16 prose-h2:mb-8 prose-h2:text-[#e32f8c]
          prose-p:text-zinc-600 prose-p:leading-relaxed prose-p:font-medium
          prose-strong:text-black
          prose-ul:text-zinc-600 prose-ul:font-medium prose-li:marker:text-[#e32f8c]">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>

        {/* CTA Section */}
        <div className="mt-24 p-8 md:p-12 rounded-3xl bg-zinc-50 border border-zinc-200 relative overflow-hidden text-center shadow-lg">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#e32f8c]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <h3 className="text-3xl md:text-5xl font-black uppercase text-black tracking-tighter mb-4 relative z-10">
            {isRo ? "Pregătit Să Treci La Nivelul Următor?" : "Ready to Level Up?"}
          </h3>
          <p className="text-lg text-zinc-500 mb-8 max-w-2xl mx-auto relative z-10">
            {isRo 
              ? "Experimentează forța brută a echipamentelor TrenZone. Construite pentru sarcini extreme, stabilitate mecanică și protecție totală." 
              : "Experience the raw power of TrenZone gear. Engineered for extreme loads, mechanical stability, and joint protection."}
          </p>
          
          <Link
            href="/shop"
            className="inline-flex relative z-10 bg-black text-white px-8 py-4 rounded-full font-black uppercase tracking-widest hover:bg-[#e32f8c] hover:text-black transition-colors"
          >
            {isRo ? "Descoperă Echipamentele" : "Shop TrenZone Gear"}
          </Link>
        </div>

      </div>
    </div>
  );
}
