import { obtenerDatos, linkWhatsApp, whatsappNumero } from '@/lib/datos';
import { IconCheck, IconLock } from '@/components/icons';
import Checkout from '@/components/Checkout';

export const dynamic = 'force-dynamic';

// LINK CORTO del checkout: /c/{nº}/{firma}. Los datos se piden VIVOS a
// Malvinas — precio vigente siempre, y si ya está paga no se paga dos
// veces. La firma la valida Malvinas (checkout-data).
export default async function CotizacionCorta({ params }: { params: { id: string; t: string } }) {
  const datos = await obtenerDatos(params.id, params.t);
  const numero = whatsappNumero();

  if (!datos) {
    return (
      <div className="tarjeta text-center">
        <div className="mb-3 flex justify-center text-slate-400">
          <IconLock className="h-9 w-9" />
        </div>
        <h1 className="font-sans text-3xl font-bold text-tinta">Este link no es válido</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          El link está incompleto o vencido. Pedinos uno nuevo por WhatsApp y te lo mandamos al
          toque.
        </p>
      </div>
    );
  }

  if (datos.pagada) {
    return (
      <div className="tarjeta text-center">
        <div className="mb-3 flex justify-center">
          <IconCheck className="h-12 w-12" />
        </div>
        <h1 className="font-sans text-3xl font-bold text-tinta">
          ¡Este pedido ya está pago{datos.n ? `, ${datos.n}` : ''}!
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Ya registramos tu pago y tu tratamiento está en marcha.
        </p>
        {numero && (
          <a
            href={linkWhatsApp(numero, `Hola! Tengo una duda sobre mi tratamiento — cotización #${datos.o}`)}
            className="mt-5 block w-full rounded-[14px] bg-[#f2c94c] px-5 py-4 text-center text-[18px] font-extrabold text-[#1c2430] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3d8ee7]"
            target="_blank"
            rel="noopener noreferrer"
          >
            Escribinos por WhatsApp
          </a>
        )}
      </div>
    );
  }

  return (
    <Checkout
      payload={datos}
      fuente={{ c: params.id, t: params.t }}
      whatsapp={numero}
      comprobanteRecibido={datos.comprobanteRecibido === true}
    />
  );
}
