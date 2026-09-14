import { NextRequest, NextResponse } from 'next/server';
import { ipDeRequest } from '@/lib/rateLimit';
import { detalleDireccion } from '@/lib/direccionesApi';

// Detalle de una sugerencia elegida (v3.2, tema 2/3) — GET
// places/{placeId} con el FieldMask de Essentials nada más (subir de
// tramo sube de precio). La lógica real vive en @/lib/direccionesApi.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { status, body: respBody } = await detalleDireccion({
    ip: ipDeRequest(req),
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
    placeId: body?.placeId,
    sessionToken: body?.sessionToken,
  });
  return NextResponse.json(respBody, { status, headers: { 'Cache-Control': 'no-store' } });
}
