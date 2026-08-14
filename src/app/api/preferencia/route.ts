import { NextRequest, NextResponse } from 'next/server';
import { total, verificarLink, type OpcionEnvio } from '@/lib/firma';
import { crearPreferencia } from '@/lib/mp';

// Crea la preferencia de Mercado Pago (Checkout Pro) para un link firmado.
// La firma se RE-VERIFICA acá y el monto se calcula del payload firmado —
// el navegador no puede mandar un precio propio.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const payload = verificarLink(body?.p, body?.t);
  if (!payload) return NextResponse.json({ error: 'Link inválido' }, { status: 400 });

  const envio: OpcionEnvio =
    body?.envio === 'cordoba' || body?.envio === 'fuera' ? body.envio : 'colegio';
  const tipo: 'contado' | 'cuotas' = body?.tipo === 'cuotas' ? 'cuotas' : 'contado';

  try {
    const pref = await crearPreferencia({
      cotizacion: payload.o,
      titulo: `Tratamiento personalizado PILL.AR — Cotización #${payload.o}`,
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
