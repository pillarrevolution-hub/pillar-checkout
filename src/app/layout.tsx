import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-archivo' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'PILL.AR — Checkout',
  description: 'Cotización y pago de tu tratamiento personalizado con tecnología PILL.AR',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${archivo.variable} font-sans`}>
        <div className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-6">
          <header className="mb-6 flex items-center justify-center gap-2">
            <span className="font-archivo text-2xl font-extrabold tracking-tight text-profundo">PILL.AR</span>
            <span className="rounded-full bg-profundo/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-profundo">
              Farmacia magistral
            </span>
          </header>
          <main className="grow">{children}</main>
          <footer className="mt-10 text-center text-xs text-niebla">
            PILL.AR S.A. · CUIT 30-71816734-1 · Córdoba, Argentina
          </footer>
        </div>
      </body>
    </html>
  );
}
