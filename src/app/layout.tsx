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
          <header className="mb-6 flex items-center justify-center">
            <span className="font-archivo text-3xl font-extrabold tracking-tight text-profundo">PILL.AR</span>
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
