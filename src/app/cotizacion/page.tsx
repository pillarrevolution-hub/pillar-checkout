import { verificarLink } from '@/lib/firma';
import { whatsappNumero } from '@/lib/datos';
import { resolverHoy } from '@/lib/colegioFechas';
import Checkout from '@/components/Checkout';

export const dynamic = 'force-dynamic';

// Formato VIEJO del link (payload firmado en la URL): sigue andando para
// los links ya mandados. Los nuevos usan el link corto /c/{id}/{firma}.
export default function Cotizacion({ searchParams }: { searchParams: { p?: string; t?: string; hoy?: string } }) {
  const payload = verificarLink(searchParams.p, searchParams.t);
  const hoy = resolverHoy(searchParams.hoy);

  if (!payload) {
    return (
      <div className="tarjeta text-center">
        <p className="mb-2 text-4xl">🔒</p>
        <h1 className="font-sans text-3xl font-bold text-tinta">Este link no es válido</h1>
        <p className="mt-2 text-sm text-slate-600">
          El link está incompleto o vencido. Pedinos uno nuevo por WhatsApp y te lo mandamos al
          toque.
        </p>
      </div>
    );
  }

  return (
    <Checkout
      payload={payload}
      fuente={{ p: searchParams.p!, t: searchParams.t! }}
      whatsapp={whatsappNumero()}
      hoy={hoy.toISOString()}
    />
  );
}
