import type { Metadata } from 'next';
import { Archivo, Inter } from 'next/font/google';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-archivo' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Tu tratamiento · PILL.AR',
  description: 'Cotización y pago de tu tratamiento personalizado con tecnología PILL.AR',
  robots: { index: false, follow: false },
};

// Estética alineada a la web de referencia del equipo (sim.pill.ar):
// banda navy con el logo, fondo celeste grisáceo, UNA tarjeta blanca.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${archivo.variable} bg-fondo font-sans text-tinta antialiased`}>
        <header className="bg-gradient-to-b from-[#0a1626] to-[#10233c] py-4">
          <p className="text-center font-archivo text-xl font-extrabold tracking-wide text-white">
            PILL<span className="text-celeste">.</span>AR
          </p>
        </header>
        <div className="mx-auto flex min-h-[calc(100vh-60px)] max-w-2xl flex-col px-4 py-8">
          <main className="grow">{children}</main>
          <footer className="mt-8 text-center text-xs text-slate-400">
            PILL.AR S.A. · CUIT 30-71816734-1 · Córdoba, Argentina
          </footer>
        </div>
      </body>
    </html>
  );
}
