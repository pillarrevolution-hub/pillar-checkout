import { confirmarPagoDeRetorno } from '@/lib/aviso';
import { linkWhatsApp, whatsappNumero } from '@/lib/datos';
import { formatoPeso } from '@/lib/firma';
import { mensajeConfirmacion } from '@/lib/mensajes';
import { FARMACIAS_RED } from '@/lib/farmaciasRed';
import { IconCheck } from '@/components/icons';

export const dynamic = 'force-dynamic';

// Vuelta del pago de Mercado Pago. Acá mismo se CONFIRMA el pago contra
// la API de MP y se avisa a Malvinas (la cotización queda PAGADA sin
// depender del webhook, que puede demorar). Misma estética de
// confirmación que el paso 5 del checkout, y el mismo botón de WhatsApp
// con el mensaje YA ARMADO (pedido de Tomi: poder corroborar el pago) —
// los datos del pedido salen de la metadata que /api/preferencia mandó a
// Mercado Pago al crear la preferencia, sin volver a pedirle nada a
// Malvinas.
export default async function Gracias({
  searchParams,
}: {
  searchParams: { pendiente?: string; status?: string; payment_id?: string; collection_id?: string };
}) {
  const paymentId = searchParams.payment_id ?? searchParams.collection_id;
  const { aprobado, resumen } = await confirmarPagoDeRetorno(paymentId);

  const pendiente =
    !aprobado &&
    (searchParams.pendiente === '1' ||
      searchParams.status === 'pending' ||
      searchParams.status === 'in_process');

  const numero = whatsappNumero();
  const mensaje =
    resumen && numero
      ? mensajeConfirmacion({
          nombre: resumen.nombre || 'paciente',
          o: resumen.o,
          accion: `pagar ${formatoPeso(resumen.monto)} por Mercado Pago${resumen.tipo === 'cuotas' ? ' (3 cuotas)' : ''}`,
          recibo: resumen.recibo,
          celular: resumen.celular || 's/d',
        })
      : null;
  const wsp = numero ? linkWhatsApp(numero, mensaje ?? '¡Hola! Ya hice el pago de mi tratamiento por Mercado Pago ✅') : null;
  const farmaciaRedInfo =
    resumen && resumen.retiroModo === 'red'
      ? FARMACIAS_RED.find((f) => f.nombre === resumen.retiroLugar)
      : undefined;

  if (pendiente) {
    return (
      <div className="tarjeta text-center">
        <p className="mb-2 text-4xl">⏳</p>
        <h1 className="font-sans text-3xl font-bold text-tinta">Pago en proceso</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu pago está siendo procesado por Mercado Pago. En cuanto se acredite arrancamos con la
          elaboración de tu tratamiento.
        </p>
      </div>
    );
  }

  return (
    <div className="tarjeta text-center">
      <div className="mb-3 flex justify-center">
        <IconCheck className="h-12 w-12" />
      </div>
      <h1 className="font-sans text-3xl font-bold text-tinta">
        {aprobado ? `¡Listo${resumen?.nombre ? `, ${resumen.nombre}` : ''}!` : '¡Pago recibido!'}
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        Ya registramos tu pago y tu pedido entra en elaboración. ¡Gracias por confiar en PILL.AR!
      </p>

      {resumen && (
        <div className="mt-5 rounded-xl bg-[#f1f5fa] p-4 text-left text-[14px] tabular-nums leading-relaxed text-[#475569]">
          <p>Recibís: {resumen.recibo}</p>
          {farmaciaRedInfo && (
            <p className="text-[13px] text-[#64748b]">
              {farmaciaRedInfo.direccion} · {farmaciaRedInfo.horario} ·{' '}
              <a href={`tel:${farmaciaRedInfo.telefonoE164}`} className="underline">
                {farmaciaRedInfo.telefono}
              </a>
            </p>
          )}
          <p>
            Pagaste: {formatoPeso(resumen.monto)} por Mercado Pago
            {resumen.tipo === 'cuotas' ? ' (3 cuotas)' : ''}
          </p>
          {resumen.celular && <p>Te avisamos al: {resumen.celular}</p>}
        </div>
      )}

      {wsp && (
        <a href={wsp} className="wa-ayuda mt-5" target="_blank" rel="noopener noreferrer">
          Si querés, avisanos por WhatsApp para que lo veamos más rápido (no es necesario)
        </a>
      )}
      <p className="mt-4 text-[13px] text-[#475569]">
        Podés cerrar esta página. Guardá el link por si querés volver a verla.
      </p>
    </div>
  );
}
