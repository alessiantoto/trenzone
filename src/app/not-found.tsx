'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 🛰️ ROOT NOT-FOUND (Catch-all)
 * Handles requests outside the [locale] structure and redirects them to the default locale.
 * Renders a clean UI and redirects on client to prevent Next.js performance measure negative timestamp errors.
 */
export default function RootNotFound() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ro');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <h1 className="text-4xl font-black mb-2 text-[#e32f8c]">404</h1>
      <p className="text-slate-400 mb-4 text-sm">Pagina nu a fost găsită. Te redirecționăm...</p>
      <a href="/ro" className="px-5 py-2.5 bg-[#e32f8c] hover:bg-[#00b0ce] text-slate-950 rounded-xl font-bold text-xs transition-colors">
        Mergi la pagina principală
      </a>
    </div>
  );
}
