import { confirmarPagoDeRetorno } from '@/lib/aviso';
import { obtenerDatos, linkWhatsApp, whatsappNumero } from '@/lib/datos';
import { formatoPeso } from '@/lib/firma';
import { mensajeConfirmacion, mensajeComprobanteTransferencia } from '@/lib/mensajes';
import { FARMACIAS_RED } from '@/lib/farmaciasRed';
import { FARMACIA_BADRA } from '@/lib/farmaciaBadra';
import { IconCheck } from '@/components/icons';
import LimpiarBorrador from '@/components/checkout/LimpiarBorrador';

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
  searchParams: {
    pendiente?: string;
    status?: string;
    payment_id?: string;
    collection_id?: string;
    transferencia?: string;
    // C5b (16-nov): solo para el camino transferencia — `o` + `t` son el
    // MISMO par firmado del link del checkout; nombre y monto se piden a
    // checkout-data con ellos (ver obtenerDatos), nunca viajan sueltos
    // por la URL.
    o?: string;
    t?: string;
  };
}) {
  const paymentId = searchParams.payment_id ?? searchParams.collection_id;
  const { aprobado, cotizacionId, resumen } = await confirmarPagoDeRetorno(paymentId);

  const pendiente =
    !aprobado &&
    (searchParams.pendiente === '1' ||
      searchParams.status === 'pending' ||
      searchParams.status === 'in_process');

  // C4/C5: "Ya envié el comprobante" (transferencia, sin Mercado Pago de
  // por medio) llega acá con ?transferencia=1 — nunca hay payment_id, así
  // que `aprobado` siempre es false.
  const transferencia = !aprobado && searchParams.transferencia === '1';
  if (transferencia) {
    const oTransferencia = Number(searchParams.o);
    // C5b (16-nov): nombre y monto se piden a checkout-data con el mismo
    // token firmado del link (no viajan por la URL) — si `t` no valida
    // (link viejo, o manipulado), `datos` es null y se muestra la
    // versión genérica sin datos del paciente.
    const datos =
      Number.isFinite(oTransferencia) && searchParams.t
        ? await obtenerDatos(oTransferencia, searchParams.t)
        : null;
    const numero = whatsappNumero();
    const wspReenvio =
      numero && datos
        ? linkWhatsApp(numero, mensajeComprobanteTransferencia({ nombre: datos.n, monto: datos.tr, cotizacion: datos.o }))
        : null;
    return (
      <div className="tarjeta text-center">
        <LimpiarBorrador o={Number.isFinite(oTransferencia) ? oTransferencia : null} />
        <div className="mb-3 flex justify-center">
          <IconCheck className="h-12 w-12" />
        </div>
        <h1 className="font-sans text-3xl font-bold text-tinta">{datos?.n ? `Gracias, ${datos.n}.` : '¡Gracias!'}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
          Cuando recibamos tu comprobante por WhatsApp te confirmamos el pago.
        </p>
        {wspReenvio && (
          <a href={wspReenvio} className="wa-ayuda mt-5" target="_blank" rel="noopener noreferrer">
            Abrir WhatsApp
          </a>
        )}
        <p className="mt-4 text-[13px] text-[#475569]">Podés cerrar esta página.</p>
      </div>
    );
  }

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
  const colegioInfo =
    resumen && resumen.retiroModo === 'colegio' && resumen.retiroLugar
      ? { localidad: resumen.retiroLugar, o: resumen.o, nombre: resumen.nombre || 'paciente' }
      : undefined;
  const mostrarBadraInfo = resumen?.retiroModo === 'badra';

  // C5 (16-nov): 3 cuotas se decide por `installments` (lo que MP
  // confirmó que se pagó), no por la metadata `tipo` — más robusto si
  // algún día no coincidieran.
  const esCuotas = !!resumen && resumen.installments > 1;
  const hayEnvio = !!resumen?.envioLocalidad;

  if (pendiente) {
    return (
      <div className="tarjeta text-center">
        <LimpiarBorrador o={cotizacionId ? Number(cotizacionId) : null} />
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
      <LimpiarBorrador o={cotizacionId ? Number(cotizacionId) : null} />
      <div className="mb-3 flex justify-center">
        <IconCheck className="h-12 w-12" />
      </div>
      <h1 className="font-sans text-3xl font-bold text-tinta">
        {aprobado ? `¡Listo${resumen?.nombre ? `, ${resumen.nombre}` : ''}!` : '¡Pago recibido!'}
      </h1>
      <p className="mt-2 text-[15px] tabular-nums leading-relaxed text-slate-600">
        {aprobado && resumen ? (
          esCuotas ? (
            <>
              {/* C5b (16-nov): UN solo "Total" en toda la pantalla — lo
                  que MP cobró de verdad (tratamiento + envío si hubo),
                  mismo número que cierra el desglose de abajo. */}
              Pagaste 3 cuotas de {formatoPeso(Math.round(resumen.monto / 3))} con Mercado Pago · Total{' '}
              {formatoPeso(resumen.monto)}.
            </>
          ) : (
            <>Pagaste {formatoPeso(resumen.monto)} con Mercado Pago.</>
          )
        ) : (
          'Ya registramos tu pago y tu pedido entra en elaboración. ¡Gracias por confiar en PILL.AR!'
        )}
      </p>

      {resumen && (
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-left text-[14px] tabular-nums leading-relaxed text-[#475569]">
          <p>Recibís: {resumen.reciboMostrado}</p>
          {farmaciaRedInfo && (
            <p className="text-[13px] text-[#475569]">
              {farmaciaRedInfo.direccion} · {farmaciaRedInfo.horario} ·{' '}
              <a href={`tel:${farmaciaRedInfo.telefonoE164}`} className="link-tap underline">
                {farmaciaRedInfo.telefono}
              </a>
            </p>
          )}
          {mostrarBadraInfo && (
            <p className="text-[13px] text-[#475569]">
              {FARMACIA_BADRA.direccion} · {FARMACIA_BADRA.horario}
            </p>
          )}
          {colegioInfo && (
            <p className="text-[13px] text-[#475569]">
              Colegio de Farmacéuticos · Unos días antes te avisamos por WhatsApp en qué farmacia de{' '}
              {colegioInfo.localidad} retirarlo.
              {numero && (
                <>
                  {' '}
                  Si no te llega el aviso,{' '}
                  <a
                    href={linkWhatsApp(
                      numero,
                      `Hola! Soy ${colegioInfo.nombre}, cotización #${colegioInfo.o}. No me llegó el aviso de en qué farmacia de ${colegioInfo.localidad} retiro mi tratamiento (Colegio de Farmacéuticos).`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-tap underline"
                  >
                    escribinos
                  </a>
                  .
                </>
              )}
            </p>
          )}

          {/* C5 (16-nov): desglose solo con envío a domicilio — con
              retiro (RED/Badra/Colegio) alcanza con el bloque de arriba. */}
          {hayEnvio && (
            <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-[13px]">
              <div className="flex justify-between gap-3">
                <span>Tratamiento</span>
                <span className="tabular-nums">{formatoPeso(resumen.lista)}</span>
              </div>
              {!esCuotas && resumen.descuento > 0 && (
                <div className="flex justify-between gap-3 text-emerald-700">
                  <span>Descuento 15%</span>
                  <span className="tabular-nums">−{formatoPeso(resumen.descuento)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span>
                  Envío a {resumen.envioLocalidad}
                  {resumen.envioProvincia ? `, ${resumen.envioProvincia}` : ''}
                </span>
                <span className="tabular-nums">
                  {resumen.envioMonto === 0 ? 'incluido' : formatoPeso(resumen.envioMonto)}
                </span>
              </div>
              <div className="flex justify-between gap-3 font-bold text-tinta">
                <span>Total</span>
                <span className="tabular-nums">{formatoPeso(resumen.monto)}</span>
              </div>
            </div>
          )}

          {resumen.celular && <p className="mt-3">Te avisamos al: {resumen.celular}</p>}
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
