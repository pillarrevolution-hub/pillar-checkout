import { NextRequest, NextResponse } from 'next/server';
import { total, verificarLink, type OpcionEnvio, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';
import { crearPreferencia } from '@/lib/mp';

// Crea la preferencia de Mercado Pago (Checkout Pro). Acepta las dos
// formas del link — corto {c, t} (busca datos VIVOS en Malvinas) y viejo
// {p, t} (payload firmado en la URL) — y el monto SIEMPRE se calcula en
// el servidor: el navegador no puede mandar un precio propio. Si la
// cotización ya está paga, no se crea nada.
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
    return NextResponse.json({ error: 'Este pedido ya está pago ✅' }, { status: 409 });
  }

  const envio: OpcionEnvio =
    body?.envio === 'cordoba' || body?.envio === 'fuera' ? body.envio : 'colegio';
  const tipo: 'contado' | 'cuotas' = body?.tipo === 'cuotas' ? 'cuotas' : 'contado';

  try {
    const pref = await crearPreferencia({
      cotizacion: payload.o,
      titulo: 'Tratamiento personalizado PILL.AR',
      monto: total(payload, envio, tipo),
      cuotas: tipo === 'cuotas' ? 3 : 1,
      envio,
      tipo,
    });
    return NextResponse.json({ init_point: pref.init_point });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'No se pudo crear el pago' }, { status: 502 });
  }
}
