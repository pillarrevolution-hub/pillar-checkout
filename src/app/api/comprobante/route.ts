import { NextRequest, NextResponse } from 'next/server';
import { verificarLink, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';

// Comprobante de transferencia subido por el paciente (v2.3): el archivo
// va en base64 al server de Malvinas (comprobante-externa, secreto
// compartido), que lo guarda junto al pedido para que Atención verifique
// la plata y confirme con ✅ PAGADO. Acepta las dos formas del link (corto
// {c,t} y viejo {p,t}) — sin firma válida no se guarda nada.
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

  const nombreArchivo = typeof body?.nombreArchivo === 'string' ? body.nombreArchivo.slice(0, 200) : '';
  const mime = typeof body?.mime === 'string' ? body.mime : '';
  const datosBase64 = typeof body?.datosBase64 === 'string' ? body.datosBase64 : '';
  if (!datosBase64 || !mime) {
    return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  }

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) {
    console.error('comprobante: falta MALVINAS_URL o CHECKOUT_SECRET en las variables de entorno');
    return NextResponse.json({ error: 'No pudimos guardar el comprobante — probá de nuevo en un ratito' }, { status: 500 });
  }

  const res = await fetch(`${malvinas}/api/cotizaciones/${payload.o}/comprobante-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({ nombreArchivo, mime, datosBase64 }),
  }).catch(() => null);

  if (!res) return NextResponse.json({ error: 'No pudimos guardar el comprobante — probá de nuevo' }, { status: 502 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json({ error: data?.error ?? 'No pudimos guardar el comprobante' }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
