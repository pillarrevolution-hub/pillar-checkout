import { NextRequest, NextResponse } from 'next/server';
import { obtenerPago } from '@/lib/mp';

// Webhook de Mercado Pago: cuando un pago queda APROBADO se le avisa a
// Malvinas, que marca la cotización como PAGADA y libera las fórmulas a
// producción (lo decidió Tomi: pago por MP = automático).
//
// MP puede avisar por query (?topic=payment&id=…) o por body
// ({type:'payment', data:{id}}). Ante error al avisar a Malvinas se
// devuelve 500 para que MP reintente solo.
export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const tipo = (body as any)?.type ?? (body as any)?.topic ?? url.searchParams.get('topic') ?? url.searchParams.get('type');
  const pagoId =
    (body as any)?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');

  // Solo interesan los avisos de pagos.
  if (String(tipo) !== 'payment' || !pagoId) return NextResponse.json({ ok: true });

  const pago = await obtenerPago(String(pagoId));
  if (!pago) return NextResponse.json({ ok: true }); // id desconocido: nada que hacer
  if (pago.status !== 'approved') return NextResponse.json({ ok: true, status: pago.status });

  // external_reference = "cotizacionId|envio|tipo" (lo puso la preferencia)
  const [cotizacionId, envio, tipoPago] = String(pago.external_reference ?? '').split('|');
  if (!cotizacionId || !Number.isFinite(Number(cotizacionId))) {
    return NextResponse.json({ ok: true, nota: 'sin external_reference' });
  }

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) return NextResponse.json({ error: 'Falta MALVINAS_URL o CHECKOUT_SECRET' }, { status: 500 });

  const res = await fetch(`${malvinas}/api/cotizaciones/${cotizacionId}/pagada-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({
      pagoId: pago.id,
      monto: pago.transaction_amount,
      metodo: pago.payment_method_id ?? pago.payment_type_id ?? 'mercadopago',
      cuotas: pago.installments ?? 1,
      envio: envio ?? '',
      tipo: tipoPago ?? '',
    }),
  }).catch(() => null);

  // 409 = ya estaba pagada (reintento de MP): dado por bueno.
  if (!res || (!res.ok && res.status !== 409)) {
    return NextResponse.json({ error: 'No se pudo avisar a Malvinas' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// MP a veces prueba el endpoint con GET.
export async function GET() {
  return NextResponse.json({ ok: true });
}
