import { NextRequest, NextResponse } from 'next/server';
import { obtenerPago } from '@/lib/mp';
import { avisarPagoAMalvinas } from '@/lib/aviso';

// Webhook de Mercado Pago — el RESPALDO del circuito (la confirmación
// principal la hace /gracias al volver del pago, porque en la primera
// prueba real MP nunca llamó acá). Procesa POST y también GET con query
// (formato IPN viejo), y ante error al avisar devuelve 500 para que MP
// reintente solo. 409 de Malvinas (ya pagada) = dado por bueno.
async function procesar(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl;
  const body = req.method === 'POST' ? await req.json().catch(() => ({} as Record<string, unknown>)) : {};

  const tipo =
    (body as any)?.type ?? (body as any)?.topic ?? url.searchParams.get('topic') ?? url.searchParams.get('type');
  const pagoId = (body as any)?.data?.id ?? url.searchParams.get('data.id') ?? url.searchParams.get('id');

  if (String(tipo) !== 'payment' || !pagoId) return NextResponse.json({ ok: true });

  const pago = await obtenerPago(String(pagoId));
  if (!pago) return NextResponse.json({ ok: true });

  const resultado = await avisarPagoAMalvinas(pago);
  console.log(`webhook: pago ${pagoId} status=${pago.status} aviso=${resultado}`);
  if (resultado === 'error') {
    return NextResponse.json({ error: 'No se pudo avisar a Malvinas' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, resultado });
}

export async function POST(req: NextRequest) {
  return procesar(req);
}

export async function GET(req: NextRequest) {
  return procesar(req);
}
