import './globals.css';
import type { Metadata } from 'next';
import { Inter, Oswald } from 'next/font/google';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const oswald = Oswald({
  variable: '--font-oswald',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: '404 — TrenZone®',
  description: 'Pagina nu a fost găsită.',
};

export default function GlobalNotFound() {
  return (
    <html lang="ro" className={`${inter.variable} ${oswald.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-[#030305] text-white font-sans p-6 text-center selection:bg-[#e32f8c] selection:text-white">
        <div className="max-w-md w-full space-y-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#e32f8c]">TrenZone®</p>
          <h1 className="text-5xl font-black uppercase tracking-tight">404</h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Pagina căutată nu a fost găsită.
          </p>
          <a
            href="/ro"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#e32f8c] hover:bg-white text-white hover:text-black font-black uppercase tracking-wider text-xs transition-colors"
          >
            Mergi la pagina principală
          </a>
        </div>
      </body>
    </html>
  );
}

