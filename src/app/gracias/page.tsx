import { confirmarPagoDeRetorno } from '@/lib/aviso';
import { linkWhatsApp, whatsappNumero } from '@/lib/datos';

export const dynamic = 'force-dynamic';

// Vuelta del pago de Mercado Pago. Acá mismo se CONFIRMA el pago contra
// la API de MP y se avisa a Malvinas (la cotización queda PAGADA sin
// depender del webhook, que puede demorar). El botón de WhatsApp avisa a
// la farmacia — pedido de Tomi: sin promesas de "cada etapa" y con un
// mensaje listo para mandar.
export default async function Gracias({
  searchParams,
}: {
  searchParams: { pendiente?: string; status?: string; payment_id?: string; collection_id?: string };
}) {
  const paymentId = searchParams.payment_id ?? searchParams.collection_id;
  const { aprobado } = await confirmarPagoDeRetorno(paymentId);

  const pendiente =
    !aprobado &&
    (searchParams.pendiente === '1' ||
      searchParams.status === 'pending' ||
      searchParams.status === 'in_process');

  const numero = whatsappNumero();
  const wsp = numero
    ? linkWhatsApp(numero, '¡Hola! Ya hice el pago de mi tratamiento por Mercado Pago ✅')
    : null;

  return (
    <div className="card p-8 text-center">
      <p className="mb-2 text-4xl">{pendiente ? '⏳' : '🎉'}</p>
      <h1 className="font-archivo text-xl font-bold text-profundo">
        {pendiente ? 'Pago en proceso' : '¡Pago recibido!'}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {pendiente
          ? 'Tu pago está siendo procesado por Mercado Pago. En cuanto se acredite arrancamos con la elaboración de tu tratamiento.'
          : 'Ya registramos tu pago y tu pedido entra en elaboración. ¡Gracias por confiar en PILL.AR! 💙'}
      </p>
      {wsp && !pendiente && (
        <a
          href={wsp}
          className="btn mt-5 bg-[#25D366] text-white hover:bg-[#1fb457]"
          target="_blank"
          rel="noopener noreferrer"
        >
          📲 Avisanos por WhatsApp
        </a>
      )}
    </div>
  );
}
