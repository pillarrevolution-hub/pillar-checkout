import { obtenerPago, type PagoMP } from './mp';
import { descripcionRecibo, reciboMostrado } from './mensajes';

// Aviso del pago aprobado a Malvinas (pagada-externa): lo usan el webhook
// de MP y TAMBIÉN la página /gracias al volver del pago — así la
// cotización queda PAGADA aunque el webhook de MP demore o no llegue
// (pasó en la primera prueba real: MP nunca llamó al notification_url).
// Idempotente: Malvinas responde 409 si ya estaba paga y se da por bueno.
export async function avisarPagoAMalvinas(
  pago: PagoMP
): Promise<'ok' | 'ya-estaba' | 'error' | 'ignorado'> {
  if (pago.status !== 'approved') return 'ignorado';
  const [cotizacionId, envio, tipo] = String(pago.external_reference ?? '').split('|');
  if (!cotizacionId || !/^\d+$/.test(cotizacionId)) return 'ignorado';

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) return 'error';

  // v3: envioLocalidad/retiroModo/retiroLugar/envioMonto salen de la
  // metadata de la preferencia (MP la devuelve tal cual en el pago) —
  // `envio` se mantiene además como nombre corto, por compatibilidad con
  // el fallback de precios fijos que todavía entiende pagada-externa.
  const m = (pago.metadata ?? {}) as Record<string, unknown>;

  const res = await fetch(`${malvinas}/api/cotizaciones/${cotizacionId}/pagada-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({
      pagoId: pago.id,
      monto: pago.transaction_amount,
      metodo: pago.payment_method_id ?? pago.payment_type_id ?? 'mercadopago',
      cuotas: pago.installments ?? 1,
      envio: envio ?? '',
      tipo: tipo ?? '',
      retiroModo: typeof m.retiro_modo === 'string' ? m.retiro_modo : '',
      retiroLugar: typeof m.retiro_lugar === 'string' ? m.retiro_lugar : '',
      envioLocalidad: typeof m.envio_localidad === 'string' ? m.envio_localidad : '',
      envioMonto: Number.isFinite(Number(m.envio_monto)) ? Number(m.envio_monto) : null,
    }),
  }).catch(() => null);

  if (!res) return 'error';
  if (res.ok) return 'ok';
  if (res.status === 409) return 'ya-estaba';
  return 'error';
}

// Resumen del pago para armar el mensaje de WhatsApp de /gracias (mismo
// formato que la confirmación en el checkout): sale de la metadata que
// mandó /api/preferencia al crear la preferencia, sin volver a pedirle
// nada a Malvinas. Si un pago viejo no tiene metadata, se degrada
// amablemente (nombre y recibo genéricos).
export type ResumenPago = {
  nombre: string;
  o: number;
  monto: number;
  tipo: 'contado' | 'cuotas' | '';
  celular: string;
  recibo: string;
  reciboMostrado: string;
  retiroModo: string;
  retiroLugar: string;
};

function resumenDesdePago(pago: PagoMP, cotizacionId: string): ResumenPago {
  const m = (pago.metadata ?? {}) as Record<string, unknown>;
  const retiroModo = typeof m.retiro_modo === 'string' ? m.retiro_modo : '';
  const retiroLugar = typeof m.retiro_lugar === 'string' ? m.retiro_lugar : '';
  const retiroFechaColegio = typeof m.retiro_fecha_colegio === 'string' ? m.retiro_fecha_colegio : '';
  const envioLocalidad = typeof m.envio_localidad === 'string' ? m.envio_localidad : '';
  const direccionTexto = typeof m.direccion_texto === 'string' ? m.direccion_texto : '';

  const reciboElegido =
    retiroModo === 'red'
      ? ({ modo: 'red', sucursal: retiroLugar } as const)
      : retiroModo === 'colegio'
        ? ({ modo: 'colegio', localidad: retiroLugar, fecha: retiroFechaColegio || undefined } as const)
        : envioLocalidad
          ? ({ modo: 'envio', direccion: direccionTexto || envioLocalidad } as const)
          : null;

  const recibo = reciboElegido ? descripcionRecibo(reciboElegido) : 'retiro en farmacia';
  const reciboMostradoTexto = reciboElegido ? reciboMostrado(reciboElegido) : 'retiro en farmacia';

  return {
    nombre: typeof m.nombre === 'string' ? m.nombre : '',
    o: Number(cotizacionId),
    monto: pago.transaction_amount,
    tipo: m.tipo === 'cuotas' ? 'cuotas' : m.tipo === 'contado' ? 'contado' : '',
    celular: typeof m.celular === 'string' ? m.celular : '',
    recibo,
    reciboMostrado: reciboMostradoTexto,
    retiroModo,
    retiroLugar,
  };
}

// Confirmación al volver del pago (/gracias?payment_id=…): consulta el
// pago real en MP y avisa a Malvinas. Nunca confía en los query params
// para el estado — el estado sale de la API de MP.
export async function confirmarPagoDeRetorno(paymentId: string | undefined): Promise<{
  aprobado: boolean;
  cotizacionId: string | null;
  resumen: ResumenPago | null;
}> {
  if (!paymentId || !/^\d+$/.test(paymentId)) return { aprobado: false, cotizacionId: null, resumen: null };
  const pago = await obtenerPago(paymentId).catch(() => null);
  if (!pago) return { aprobado: false, cotizacionId: null, resumen: null };
  const resultado = await avisarPagoAMalvinas(pago);
  console.log(`gracias: pago ${paymentId} status=${pago.status} aviso=${resultado}`);
  const cotizacionId = String(pago.external_reference ?? '').split('|')[0] || null;
  const resumen = cotizacionId && pago.metadata?.nombre ? resumenDesdePago(pago, cotizacionId) : null;
  return { aprobado: pago.status === 'approved', cotizacionId, resumen };
}
