import { NextRequest, NextResponse } from 'next/server';
import { total, verificarLink, type EleccionEnvio, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';

// Contacto del paciente (v2.2, extendido en v3 con envío/retiro): celular,
// dirección y la elección de recibo que hace en el paso a paso. Se
// reenvían a Malvinas (POST /api/cotizaciones/[id]/contacto-externa,
// secreto compartido) apenas los completa y también al cambiar de medio
// de pago (cambia el total esperado) — si después paga por transferencia
// al alias no hay ningún webhook, así que este es el único momento
// seguro. Acepta las dos formas del link (corto {c,t} y viejo {p,t}).
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
  const retiroModo: 'red' | 'colegio' | '' =
    body?.retiroModo === 'red' || body?.retiroModo === 'colegio' ? body.retiroModo : '';
  const retiroLugar = typeof body?.retiroLugar === 'string' ? body.retiroLugar.trim().slice(0, 80) : '';
  // Ya vino RESUELTA desde el navegador (buscarTarifa contra el mismo
  // tarifario vivo) — Malvinas la vuelve a resolver igual, esto es solo
  // para que el guardado no se quede mudo mientras el paciente escribe.
  const envioLocalidad = typeof body?.envioLocalidad === 'string' ? body.envioLocalidad.trim().slice(0, 80) : '';
  const envioMonto = typeof body?.envioMonto === 'number' && Number.isFinite(body.envioMonto) ? body.envioMonto : null;
  const tipo: 'contado' | 'cuotas' = body?.tipo === 'cuotas' ? 'cuotas' : 'contado';

  if (!celular && !direccion && !retiroModo && !envioLocalidad) {
    return NextResponse.json({ ok: true });
  }

  const eleccion: EleccionEnvio | null =
    retiroModo || envioLocalidad === ''
      ? { modo: 'retiro' }
      : envioLocalidad
        ? { modo: 'envio', monto: envioMonto ?? 0 }
        : null;
  const totalEsperado = eleccion ? total(payload, eleccion, tipo) : undefined;

  const malvinas = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  const secreto = process.env.CHECKOUT_SECRET ?? '';
  if (!malvinas || !secreto) return NextResponse.json({ error: 'Config incompleta' }, { status: 500 });

  const res = await fetch(`${malvinas}/api/cotizaciones/${payload.o}/contacto-externa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-checkout-secret': secreto },
    body: JSON.stringify({
      celular,
      direccion,
      retiroModo,
      retiroLugar,
      envioLocalidad,
      envioMonto,
      tipo,
      totalEsperado,
    }),
  }).catch(() => null);

  if (!res || !res.ok) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 502 });
  return NextResponse.json({ ok: true });
}
