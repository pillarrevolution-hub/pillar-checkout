import { obtenerDatos, whatsappNumero } from '@/lib/datos';
import Checkout from '@/components/Checkout';

export const dynamic = 'force-dynamic';

// LINK CORTO del checkout: /c/{nº}/{firma}. Los datos se piden VIVOS a
// Malvinas — precio vigente siempre, y si ya está paga no se paga dos
// veces. La firma la valida Malvinas (checkout-data).
export default async function CotizacionCorta({ params }: { params: { id: string; t: string } }) {
  const datos = await obtenerDatos(params.id, params.t);

  if (!datos) {
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

  if (datos.pagada) {
    return (
      <div className="tarjeta text-center">
        <p className="mb-2 text-4xl">✅</p>
        <h1 className="font-sans text-3xl font-bold text-tinta">
          ¡Este pedido ya está pago{datos.n ? `, ${datos.n}` : ''}!
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Ya registramos tu pago y tu tratamiento está en marcha. Cualquier duda, escribinos por
          WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <Checkout
      payload={datos}
      fuente={{ c: params.id, t: params.t }}
      whatsapp={whatsappNumero()}
      comprobanteRecibido={datos.comprobanteRecibido === true}
    />
  );
}
