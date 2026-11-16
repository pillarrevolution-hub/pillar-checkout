import { NextRequest, NextResponse } from 'next/server';
import { verificarLink, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';

// Aviso de transferencia por WhatsApp (C4, 16-nov): se eliminó la subida
// de archivo — el paciente manda el comprobante por WhatsApp y esto solo
// le avisa a Malvinas que lo hizo, para que Atención sepa que hay una
// transferencia por verificar. Reenvía a comprobante-externa con
// `canal: 'whatsapp'` y SIN archivo; Malvinas todavía no acepta ese caso
// (ver DESIGN.md, "Malvinas: aceptar comprobante-externa sin archivo") y
// devuelve 400 hasta que se actualice el repo padre. Por eso nunca
// bloquea al paciente: cualquier respuesta que no sea 200 se loguea
// server-side (para no perder el seguimiento) y el checkout sigue a
// /gracias igual — el paciente YA le mandó el comprobante a Atención por
// WhatsApp, eso no depende de este aviso.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  let payload: (PayloadCheckout & { pagada?: boolean }) | null = null;
  if (typeof body?.c === 'string' || typeof body?.c === 'number') {
    payload = await obtenerDatos(body.c, String(body?.t ?? ''));
  } else {
    payload = verificarLink(body?.p, body?.t);
  }
  if (!payload) return NextResponse.json({ error: 'Link inválido' }, { status: 400 });
  if (payload.pagada) {
    return NextResponse.json({ error: 'Este pedido ya está pago.' }, { status: 409 });
  }

  const o = payload.o;
  const nombre = payload.n ?? '';
  const celular = typeof body?.celular === 'string' ? body.celular.trim().slice(0, 60) : '';

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) {
    console.warn(`comprobante: falta MALVINAS_URL o CHECKOUT_SECRET — no se avisó a Malvinas (o=${o})`);
    return NextResponse.json({ ok: true });
  }

  const res = await fetch(`${malvinas}/api/cotizaciones/${o}/comprobante-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({ canal: 'whatsapp', celular, nombre }),
  }).catch((e) => {
    console.warn(`comprobante: no se pudo avisar a Malvinas (o=${o}):`, e);
    return null;
  });

  if (!res || !res.ok) {
    const data = res ? await res.json().catch(() => ({})) : null;
    console.warn(
      `comprobante: Malvinas no confirmó el aviso por WhatsApp (o=${o}, status=${res?.status ?? 'sin respuesta'}):`,
      data
    );
  }

  return NextResponse.json({ ok: true });
}
