import { obtenerPago, type PagoMP } from './mp';

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
    }),
  }).catch(() => null);

  if (!res) return 'error';
  if (res.ok) return 'ok';
  if (res.status === 409) return 'ya-estaba';
  return 'error';
}

// Confirmación al volver del pago (/gracias?payment_id=…): consulta el
// pago real en MP y avisa a Malvinas. Nunca confía en los query params
// para el estado — el estado sale de la API de MP.
export async function confirmarPagoDeRetorno(paymentId: string | undefined): Promise<{
  aprobado: boolean;
  cotizacionId: string | null;
}> {
  if (!paymentId || !/^\d+$/.test(paymentId)) return { aprobado: false, cotizacionId: null };
  const pago = await obtenerPago(paymentId).catch(() => null);
  if (!pago) return { aprobado: false, cotizacionId: null };
  const resultado = await avisarPagoAMalvinas(pago);
  console.log(`gracias: pago ${paymentId} status=${pago.status} aviso=${resultado}`);
  const cotizacionId = String(pago.external_reference ?? '').split('|')[0] || null;
  return { aprobado: pago.status === 'approved', cotizacionId };
}
