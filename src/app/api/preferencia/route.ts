import { NextRequest, NextResponse } from 'next/server';
import { montoEnvio, total, verificarLink, type EleccionEnvio, type PayloadCheckout } from '@/lib/firma';
import { obtenerDatos } from '@/lib/datos';
import { buscarTarifa } from '@/lib/envios';
import { crearPreferencia } from '@/lib/mp';

// Crea la preferencia de Mercado Pago (Checkout Pro). Acepta las dos
// formas del link — corto {c, t} (busca datos VIVOS en Malvinas) y viejo
// {p, t} (payload firmado en la URL) — y el monto SIEMPRE se calcula en
// el servidor contra el tarifario vivo: el navegador no puede mandar un
// precio propio. Si la cotización ya está paga, no se crea nada.
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

  const retiroModo: 'red' | 'colegio' | '' =
    body?.retiroModo === 'red' || body?.retiroModo === 'colegio' ? body.retiroModo : '';
  const retiroLugar = typeof body?.retiroLugar === 'string' ? body.retiroLugar.trim().slice(0, 80) : '';
  const envioLocalidadTexto = typeof body?.envioLocalidad === 'string' ? body.envioLocalidad.trim() : '';
  const tipo: 'contado' | 'cuotas' = body?.tipo === 'cuotas' ? 'cuotas' : 'contado';
  const celular = typeof body?.celular === 'string' ? body.celular.trim().slice(0, 60) : '';
  const direccionTexto = typeof body?.direccionTexto === 'string' ? body.direccionTexto.trim().slice(0, 200) : '';
  const retiroFechaColegio = typeof body?.retiroFechaColegio === 'string' ? body.retiroFechaColegio.trim().slice(0, 80) : '';

  let eleccion: EleccionEnvio;
  let envioLocalidadCanonica = '';
  let refEnvio = 'retiro';

  if (retiroModo) {
    eleccion = { modo: 'retiro' };
    refEnvio = retiroModo;
  } else if (envioLocalidadTexto) {
    const tarifa = buscarTarifa(envioLocalidadTexto, payload.envios?.tarifas ?? []);
    if (!tarifa) return NextResponse.json({ error: 'No encontramos esa localidad — volvé al paso anterior y probá de nuevo' }, { status: 400 });
    envioLocalidadCanonica = tarifa.l;
    eleccion = { modo: 'envio', monto: payload.envioAdentro ? 0 : tarifa.m };
    refEnvio = tarifa.l;
  } else {
    return NextResponse.json({ error: 'Elegí cómo recibirlo' }, { status: 400 });
  }

  const envioMonto = montoEnvio(eleccion);

  try {
    const pref = await crearPreferencia({
      cotizacion: payload.o,
      titulo: 'Tratamiento personalizado PILL.AR',
      monto: total(payload, eleccion, tipo),
      cuotas: tipo === 'cuotas' ? 3 : 1,
      envio: refEnvio,
      tipo,
      metadata: {
        nombre: payload.n,
        retiro_modo: retiroModo,
        retiro_lugar: retiroLugar,
        retiro_fecha_colegio: retiroFechaColegio,
        envio_localidad: envioLocalidadCanonica,
        envio_monto: envioMonto,
        direccion_texto: direccionTexto,
        celular,
      },
    });
    return NextResponse.json({ init_point: pref.init_point });
  } catch (e: any) {
    // Nunca se le manda al paciente el motivo técnico (token faltante,
    // respuesta de Mercado Pago, etc.) — eso queda en el log del server.
    console.error('preferencia: no se pudo crear el pago —', e?.message ?? e);
    return NextResponse.json({ error: 'No pudimos iniciar el pago — probá de nuevo en un ratito' }, { status: 502 });
  }
}
