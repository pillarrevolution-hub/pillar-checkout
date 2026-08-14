'use client';
import { useMemo, useState } from 'react';
import {
  formatoPeso,
  montoEnvio,
  total,
  type OpcionEnvio,
  type PayloadCheckout,
} from '@/lib/firma';

// ---------------------------------------------------------------
// El checkout en 3 pasos, en una sola pantalla:
//   1. cómo recibirlo (retiro gratis por el Colegio / envío Córdoba /
//      envío fuera de Córdoba),
//   2. cómo pagarlo (transferencia 15% OFF / MP un pago / MP en cuotas),
//   3. pagar: transferencia muestra alias + monto con botones de copiar
//      (lo que le faltaba a sim.pill.ar); MP redirige al Checkout Pro.
// Los precios vienen FIRMADOS en el link — acá no se calcula nada
// sensible, y la preferencia de MP se crea en el servidor re-verificando
// la firma.
// ---------------------------------------------------------------

const ALIAS = 'pill.ar';
const TITULAR = 'PILL.AR S.A. · CUIT 30-71816734-1';

const ENVIOS: { id: OpcionEnvio; icono: string; titulo: string; detalle: string }[] = [
  {
    id: 'colegio',
    icono: '🏥',
    titulo: 'Retiro en farmacia — sin cargo',
    detalle:
      'A través del convenio con el Colegio de Farmacéuticos te informamos en qué farmacia de tu localidad retirar cuando esté elaborado.',
  },
  {
    id: 'cordoba',
    icono: '🛵',
    titulo: 'Envío a domicilio — Córdoba capital',
    detalle: 'Te lo llevamos a tu casa dentro de la ciudad de Córdoba.',
  },
  {
    id: 'fuera',
    icono: '📦',
    titulo: 'Envío a domicilio — resto del país',
    detalle: 'Envío fuera de Córdoba capital, a todo el país.',
  },
];

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Checkout({ payload, p, t }: { payload: PayloadCheckout; p: string; t: string }) {
  const [envio, setEnvio] = useState<OpcionEnvio | null>(null);
  const [pago, setPago] = useState<'transferencia' | 'contado' | 'cuotas' | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState<'alias' | 'monto' | null>(null);

  const totales = useMemo(() => {
    if (envio == null) return null;
    const contado = total(payload, envio, 'contado');
    const cuotas = total(payload, envio, 'cuotas');
    return { contado, cuotas, cuota: Math.round(cuotas / 3), ahorro: cuotas - contado, envio: montoEnvio(payload, envio) };
  }, [payload, envio]);

  async function copiar(texto: string, que: 'alias' | 'monto') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* seleccionar a mano */
    }
  }

  async function pagarConMP(tipo: 'contado' | 'cuotas') {
    if (envio == null) return;
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p, t, envio, tipo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.init_point) throw new Error(data?.error ?? 'No pudimos iniciar el pago');
      window.location.href = data.init_point;
    } catch (e: any) {
      setError(e.message ?? 'No pudimos iniciar el pago — probá de nuevo en un ratito');
      setCargando(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Saludo + resumen */}
      <div className="card p-5">
        <h1 className="font-archivo text-2xl font-extrabold leading-tight text-profundo">
          ¡Hola {payload.n}! 👋
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Acá está la cotización de tu <b>tratamiento personalizado</b> elaborado con tecnología
          PILL.AR — cotización&nbsp;#{payload.o}.
        </p>
        {payload.d && (
          <p className="mt-3 rounded-xl bg-profundo/5 px-3 py-2 text-sm font-semibold text-profundo">
            📦 Estimamos tenerlo listo el {fechaLarga(payload.d)}
          </p>
        )}
      </div>

      {/* Paso 1: envío */}
      <div className="card p-5">
        <p className="mb-3 font-archivo text-sm font-bold uppercase tracking-wider text-niebla">
          1 · ¿Cómo lo querés recibir?
        </p>
        <div className="space-y-2">
          {ENVIOS.map((e) => {
            const precio = e.id === 'colegio' ? 0 : e.id === 'cordoba' ? payload.ec : payload.el;
            const activo = envio === e.id;
            return (
              <button
                key={e.id}
                onClick={() => setEnvio(e.id)}
                className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                  activo ? 'border-profundo bg-profundo/5' : 'border-linea bg-white hover:border-profundo/40'
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-bold">
                    <span className="text-lg">{e.icono}</span> {e.titulo}
                  </span>
                  <span className={`shrink-0 text-sm font-black ${precio === 0 ? 'text-green-700' : 'text-profundo'}`}>
                    {precio === 0 ? 'GRATIS' : `+ ${formatoPeso(precio)}`}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-slate-500">{e.detalle}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Paso 2: pago */}
      <div className={`card p-5 ${envio == null ? 'pointer-events-none opacity-40' : ''}`}>
        <p className="mb-3 font-archivo text-sm font-bold uppercase tracking-wider text-niebla">
          2 · ¿Cómo lo querés pagar?
        </p>
        {totales && (
          <div className="space-y-2">
            <button
              onClick={() => setPago('transferencia')}
              className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                pago === 'transferencia' ? 'border-profundo bg-profundo/5' : 'border-linea hover:border-profundo/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>🏦 Transferencia bancaria</span>
                <span className="text-base font-black text-green-700">{formatoPeso(totales.contado)}</span>
              </span>
              <span className="mt-0.5 block text-xs text-green-700">
                Te ahorrás {formatoPeso(totales.ahorro)} (15% OFF) — el precio más conveniente
              </span>
            </button>
            <button
              onClick={() => setPago('contado')}
              className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                pago === 'contado' ? 'border-profundo bg-profundo/5' : 'border-linea hover:border-profundo/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>💳 Mercado Pago — un pago</span>
                <span className="text-base font-black text-profundo">{formatoPeso(totales.contado)}</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Mismo precio que transferencia, pagando con dinero en cuenta o débito
              </span>
            </button>
            <button
              onClick={() => setPago('cuotas')}
              className={`w-full rounded-xl border-2 p-3 text-left transition-colors ${
                pago === 'cuotas' ? 'border-profundo bg-profundo/5' : 'border-linea hover:border-profundo/40'
              }`}
            >
              <span className="flex items-center justify-between gap-2 text-sm font-bold">
                <span>💳 Mercado Pago — 3 cuotas</span>
                <span className="text-base font-black text-profundo">3 × {formatoPeso(totales.cuota)}</span>
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Total {formatoPeso(totales.cuotas)} con tarjeta de crédito
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Paso 3: pagar */}
      {envio != null && pago != null && totales && (
        <div className="card border-2 border-profundo p-5">
          <p className="mb-3 font-archivo text-sm font-bold uppercase tracking-wider text-niebla">3 · Pagá</p>

          {pago === 'transferencia' ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Transferí <b className="text-turba">{formatoPeso(totales.contado)}</b> al alias:
              </p>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-profundo/5 p-3">
                <div>
                  <p className="font-archivo text-xl font-extrabold tracking-tight text-profundo">{ALIAS}</p>
                  <p className="text-xs text-slate-500">{TITULAR}</p>
                </div>
                <button
                  className="btn !w-auto bg-profundo text-white hover:bg-profundo/90"
                  onClick={() => copiar(ALIAS, 'alias')}
                >
                  {copiado === 'alias' ? '✓ Copiado' : 'Copiar alias'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-profundo/5 p-3">
                <p className="text-lg font-black">{formatoPeso(totales.contado)}</p>
                <button
                  className="btn !w-auto bg-profundo text-white hover:bg-profundo/90"
                  onClick={() => copiar(String(totales.contado), 'monto')}
                >
                  {copiado === 'monto' ? '✓ Copiado' : 'Copiar monto'}
                </button>
              </div>
              <p className="rounded-xl border-l-4 border-l-tussok bg-tussok/10 p-3 text-xs leading-relaxed text-slate-700">
                Cuando transfieras, <b>mandanos el comprobante por WhatsApp</b> (al mismo chat de
                siempre) y arrancamos con la elaboración 🚀
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Vas a pagar <b className="text-turba">{formatoPeso(pago === 'cuotas' ? totales.cuotas : totales.contado)}</b>
                {pago === 'cuotas' && <> en 3 cuotas de <b>{formatoPeso(totales.cuota)}</b></>} a través de
                Mercado Pago, en su sitio seguro.
              </p>
              <button
                className="btn bg-[#009EE3] text-white hover:bg-[#0089c4] disabled:opacity-60"
                disabled={cargando}
                onClick={() => pagarConMP(pago)}
              >
                {cargando ? 'Preparando el pago…' : '💳 Pagar con Mercado Pago'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Al acreditarse el pago, tu pedido entra en elaboración automáticamente.
              </p>
            </div>
          )}

          {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        </div>
      )}

      <p className="text-center text-xs text-niebla">
        ¿Dudas con tu cotización? Escribinos por WhatsApp — estamos para ayudarte.
      </p>
    </div>
  );
}
