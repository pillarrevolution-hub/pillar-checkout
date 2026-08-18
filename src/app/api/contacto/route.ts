import { NextRequest, NextResponse } from 'next/server';
import { verificarLink, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';

// Contacto del paciente (v2.2): celular y dirección de envío que escribe
// en el paso 3 del checkout. Se reenvían a Malvinas
// (POST /api/cotizaciones/[id]/contacto-externa, secreto compartido) APENAS
// los completa — si después paga por transferencia al alias no hay ningún
// webhook, así que este es el único momento seguro. Acepta las dos formas
// del link (corto {c,t} y viejo {p,t}), igual que /api/preferencia: sin
// firma válida no se guarda nada.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  let payload: (PayloadCheckout & { pagada?: boolean }) | null = null;
  if (typeof body?.c === 'string' || typeof body?.c === 'number') {
    payload = await obtenerDatos(body.c, String(body?.t ?? ''));
  } else {
    payload = verificarLink(body?.p, body?.t);
  }
  if (!payload) return NextResponse.json({ error: 'Link inválido' }, { status: 400 });

  const celular = typeof body?.celular === 'string' ? body.celular.trim().slice(0, 60) : '';
  const direccion = typeof body?.direccion === 'string' ? body.direccion.trim().slice(0, 300) : '';
  if (!celular && !direccion) return NextResponse.json({ ok: true });

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) return NextResponse.json({ error: 'Config incompleta' }, { status: 500 });

  const res = await fetch(`${malvinas}/api/cotizaciones/${payload.o}/contacto-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({ celular, direccion }),
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
