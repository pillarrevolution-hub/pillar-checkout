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
// Checkout PILL.AR — estética alineada a la web de referencia del equipo
// (sim.pill.ar, "a todos les gustó más esa"): tarjeta única, "Hola,
// Nombre." en serif, precio en tarjeta navy con badge amarillo de
// descuento, pasos con círculo celeste, opciones con radio, resumen y
// botón azul a Mercado Pago. Diferencias de fondo que se conservan:
// transferencia al alias con botones de copiar, dos zonas de envío con
// precio al instante, y datos siempre vigentes desde Malvinas.
// Textos en clave de BENEFICIO (CEO): "15% de descuento", "3 cuotas sin
// interés" — nunca "te ahorrás / pagás más".
// ---------------------------------------------------------------

const ALIAS = 'pill.ar';
const TITULAR = 'PILL.AR S.A. · CUIT 30-71816734-1';

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}

function Radio({ activo }: { activo: boolean }) {
  return (
    <span className={`radio relative ${activo ? 'border-[#3d8ee7]' : 'border-slate-300'} bg-white`}>
      {activo && <span className="absolute inset-[3px] rounded-full bg-[#3d8ee7]" />}
    </span>
  );
}

export default function Checkout({
  payload,
  fuente,
  whatsapp,
}: {
  payload: PayloadCheckout;
  // link corto {c, t} o formato viejo {p, t} — va tal cual a /api/preferencia
  fuente: { c: string; t: string } | { p: string; t: string };
  whatsapp: string | null;
}) {
  // Como en la web de referencia: retiro y contado ya vienen elegidos.
  const [recibe, setRecibe] = useState<'retiro' | 'envio'>('retiro');
  const [zona, setZona] = useState<'cordoba' | 'fuera' | null>(null);
  const [pago, setPago] = useState<'contado' | 'cuotas'>('contado');
  const [verTransferencia, setVerTransferencia] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState<'alias' | 'monto' | null>(null);

  const envio: OpcionEnvio = recibe === 'retiro' ? 'colegio' : zona ?? 'cordoba';
  const envioElegido = recibe === 'retiro' || zona != null;

  const t = useMemo(() => {
    const contado = total(payload, envio, 'contado');
    const cuotas = total(payload, envio, 'cuotas');
    return {
      contado,
      cuotas,
      cuota: Math.round(cuotas / 3),
      envio: montoEnvio(payload, envio),
    };
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

  async function pagarConMP() {
    setCargando(true);
    setError('');
    try {
      const res = await fetch('/api/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuente, envio, tipo: pago }),
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
    <div className="tarjeta">
      {/* Encabezado */}
      <span className="chip">Cotización personalizada</span>
      <h1 className="mt-3 font-serif text-4xl font-bold text-tinta">Hola, {payload.n}.</h1>
      <p className="mt-2 text-[15px] text-slate-500">
        Preparada por el equipo de PILL.AR. Elegí cómo recibirlo y cómo pagarlo.
      </p>

      {/* La cotización primero (CEO): tarjeta navy con el precio */}
      <div className="mt-5 rounded-2xl bg-gradient-to-b from-[#0f2036] to-navy p-5 text-white">
        <p className="font-bold">Tratamiento personalizado con tecnología PILL.AR</p>
        <p className="mt-3 text-[15px] text-slate-300">
          Valor de tu tratamiento: <s className="text-slate-400">{formatoPeso(payload.li)}</s>
        </p>
        <p className="mt-1">
          <span className="font-serif text-4xl font-bold">{formatoPeso(payload.tr)}</span>
          <span className="ml-2 text-sm text-slate-300">pagando de contado</span>
        </p>
        <span className="mt-3 inline-block rounded-full bg-[#f2c94c] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1c2430]">
          15% de descuento pagando de contado
        </span>
        {payload.d && (
          <p className="mt-3 text-xs text-slate-300">📦 Estimamos tenerlo listo el {fechaLarga(payload.d)}.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Tu medicamento será elaborado por Nueva Farmacia Badra.
      </p>

      {/* Paso 1 · ¿Cómo lo recibís? */}
      <div className="mt-6 flex items-center gap-2.5">
        <span className="paso">1</span>
        <h2 className="text-lg font-bold">¿Cómo lo recibís?</h2>
      </div>
      <div className="mt-3 space-y-2.5">
        <button
          className={`opcion ${recibe === 'retiro' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setRecibe('retiro')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'retiro'} />
            <span>
              <span className="block text-[15px] font-bold">Retiro en farmacia</span>
              <span className="block text-[13px] text-slate-500">Sin cargo.</span>
            </span>
          </span>
        </button>
        {recibe === 'retiro' && (
          <div className="rounded-xl bg-[#eaf3fd] p-4 text-[14px] leading-relaxed text-[#2d5175]">
            A través de un convenio con el Colegio de Farmacéuticos de la Provincia de Córdoba te
            informaremos en cuál farmacia de tu localidad podrás retirar cuando ya esté elaborado tu
            pedido.
          </div>
        )}
        <button
          className={`opcion ${recibe === 'envio' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setRecibe('envio')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'envio'} />
            <span>
              <span className="block text-[15px] font-bold">Envío a domicilio</span>
              <span className="block text-[13px] text-slate-500">
                Elegí tu zona y te mostramos el costo al instante.
              </span>
            </span>
          </span>
        </button>
        {recibe === 'envio' && (
          <div className="ml-6 space-y-2">
            {(
              [
                ['cordoba', 'Córdoba capital', payload.ec],
                ['fuera', 'Resto del país', payload.el],
              ] as const
            ).map(([id, titulo, precio]) => (
              <button
                key={id}
                className={`opcion !p-3 ${zona === id ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => setZona(id)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <Radio activo={zona === id} />
                    <span className="text-[14px] font-bold">{titulo}</span>
                  </span>
                  <span className="text-[14px] font-extrabold text-tinta">+ {formatoPeso(precio)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Paso 2 · ¿Cómo lo pagás? */}
      <div className="mt-7 flex items-center gap-2.5">
        <span className="paso">2</span>
        <h2 className="text-lg font-bold">¿Cómo lo pagás?</h2>
      </div>
      <div className="mt-3 space-y-2.5">
        <button
          className={`opcion ${pago === 'contado' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setPago('contado')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'contado'} />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                De contado — {formatoPeso(t.contado)}
                <span className="rounded-full bg-[#f2c94c] px-2 py-0.5 text-[11px] font-extrabold text-[#1c2430]">
                  15% OFF
                </span>
              </span>
              <span className="block text-[13px] text-slate-500">
                Solo por pagar de contado: transferencia bancaria o dinero en cuenta de Mercado Pago.
              </span>
            </span>
          </span>
        </button>
        <button
          className={`opcion ${pago === 'cuotas' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setPago('cuotas')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'cuotas'} />
            <span>
              <span className="block text-[15px] font-bold">
                3 cuotas sin interés de {formatoPeso(t.cuota)}
              </span>
              <span className="block text-[13px] text-slate-500">
                Con tarjeta de crédito, en 3 pagos iguales.
              </span>
            </span>
          </span>
        </button>
      </div>

      {/* Resumen */}
      <div className="mt-6 rounded-xl bg-[#f1f5fa] p-5">
        <p className="text-[15px] text-slate-600">
          Tratamiento personalizado: {formatoPeso(payload.li)}
        </p>
        {pago === 'contado' && (
          <p className="mt-1 text-[15px] font-bold text-green-700">
            Descuento pagando de contado (15%): −{formatoPeso(payload.li - payload.tr)}
          </p>
        )}
        <p className="mt-1 text-[15px] text-slate-600">
          {recibe === 'retiro'
            ? 'Retiro en farmacia: sin cargo'
            : envioElegido
              ? `Envío a domicilio (${zona === 'fuera' ? 'resto del país' : 'Córdoba capital'}): ${formatoPeso(t.envio)}`
              : 'Envío a domicilio: elegí tu zona'}
        </p>
        <p className="mt-2 font-serif text-3xl font-bold text-tinta">
          Total: {formatoPeso(pago === 'contado' ? t.contado : t.cuotas)}
        </p>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {pago === 'contado'
            ? 'Transferencia bancaria o dinero en cuenta de Mercado Pago'
            : `3 cuotas sin interés de ${formatoPeso(t.cuota)} con tarjeta de crédito`}
        </p>
      </div>

      {/* Pagar */}
      <div className="mt-5 space-y-3">
        <button className="btn-mp disabled:opacity-60" disabled={cargando || !envioElegido} onClick={pagarConMP}>
          {cargando ? 'Preparando el pago…' : 'Ir a pagar con Mercado Pago →'}
        </button>
        {!envioElegido && (
          <p className="text-center text-xs font-medium text-amber-700">Elegí la zona de envío para continuar.</p>
        )}
        {pago === 'contado' && (
          <button
            className="block w-full text-center text-[14px] font-semibold text-[#2f6fbd] hover:underline"
            onClick={() => setVerTransferencia((v) => !v)}
          >
            {verTransferencia ? 'Ocultar datos de transferencia' : 'O pagá por transferencia bancaria — ver alias'}
          </button>
        )}
        {pago === 'contado' && verTransferencia && (
          <div className="space-y-2.5 rounded-xl border border-slate-200 p-4">
            <p className="text-[14px] text-slate-600">
              Transferí <b className="text-tinta">{formatoPeso(t.contado)}</b> al alias:
            </p>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-3">
              <div>
                <p className="font-archivo text-lg font-extrabold tracking-tight text-navy">{ALIAS}</p>
                <p className="text-xs text-slate-500">{TITULAR}</p>
              </div>
              <button
                className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                onClick={() => copiar(ALIAS, 'alias')}
              >
                {copiado === 'alias' ? '✓ Copiado' : 'Copiar alias'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-3">
              <p className="text-lg font-extrabold">{formatoPeso(t.contado)}</p>
              <button
                className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                onClick={() => copiar(String(t.contado), 'monto')}
              >
                {copiado === 'monto' ? '✓ Copiado' : 'Copiar monto'}
              </button>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-500">
              Cuando transfieras, mandanos el comprobante por WhatsApp y arrancamos con la
              elaboración.
            </p>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('¡Hola! Ya hice la transferencia de mi tratamiento — te mando el comprobante 🏦')}`}
                className="block w-full rounded-xl bg-[#25D366] py-3 text-center text-[15px] font-bold text-white hover:bg-[#1fb457]"
                target="_blank"
                rel="noopener noreferrer"
              >
                📲 Mandar comprobante por WhatsApp
              </a>
            )}
          </div>
        )}
        {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
      </div>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-slate-400">
        Pago procesado por Mercado Pago. Al pagar aceptás los Términos y Condiciones y la Política
        de Privacidad de PILL.AR.
      </p>
    </div>
  );
}
