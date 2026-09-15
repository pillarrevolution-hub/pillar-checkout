import { NextRequest, NextResponse } from 'next/server';
import { ipDeRequest } from '@/lib/rateLimit';
import { sugerirDirecciones } from '@/lib/direccionesApi';

// Sugerencias de dirección (v3.2, tema 2/3) — único lugar del checkout
// que habla con Google Places. REGLA DE ORO: si Google falla, tarda o no
// hay key, el combobox se degrada solo (el front trata cualquier
// respuesta que no sea 200 con `sugerencias` como "seguir sin Google")
// — nunca se bloquea el pago por esto. La lógica real vive en
// @/lib/direccionesApi (así se puede testear con fetch mockeado sin
// pasar por next/server).
//
// Nunca se manda a Google nada del paciente (celular/nombre/DNI): solo
// el texto de la calle y la localidad ya elegida.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { status, body: respBody } = await sugerirDirecciones({
    ip: ipDeRequest(req),
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    texto: body?.texto,
    localidad: body?.localidad,
    provincia: body?.provincia,
    sessionToken: body?.sessionToken,
  });
  return NextResponse.json(respBody, { status, headers: { 'Cache-Control': 'no-store' } });
}
