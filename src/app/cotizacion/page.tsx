import { verificarLink } from '@/lib/firma';
import Checkout from '@/components/Checkout';

export const dynamic = 'force-dynamic';

// La página del checkout: verifica la firma DEL LADO DEL SERVIDOR y recién
// ahí muestra precios. Un link inválido o retocado no muestra nada.
export default function Cotizacion({ searchParams }: { searchParams: { p?: string; t?: string } }) {
  const payload = verificarLink(searchParams.p, searchParams.t);

  if (!payload) {
    return (
      <div className="card p-8 text-center">
        <p className="mb-2 text-4xl">🔒</p>
        <h1 className="font-archivo text-xl font-bold text-profundo">Este link no es válido</h1>
        <p className="mt-2 text-sm text-slate-600">
          El link está incompleto o vencido. Pedinos uno nuevo por WhatsApp y te lo mandamos al
          toque.
        </p>
      </div>
    );
  }

  return <Checkout payload={payload} p={searchParams.p!} t={searchParams.t!} />;
}
