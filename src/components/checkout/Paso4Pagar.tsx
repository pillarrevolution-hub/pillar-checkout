'use client';
import { useRef, useState } from 'react';
import { formatoPeso } from '@/lib/firma';
import { linkWhatsApp } from '@/lib/datos';
import { mensajeComprobanteTransferencia } from '@/lib/mensajes';
import { PasoFooter } from './ui';
import { IconCheck } from '../icons';
import type { Pago } from './Paso3Pago';

const ALIAS = 'pill.ar';
const TITULAR = 'PILL.AR S.A. · CUIT 30-71816734-1';

export default function Paso4Pagar({
  cotizacion,
  nombre,
  pago,
  monto,
  cuota,
  comprobanteRecibido,
  enviandoAviso,
  onEnviarComprobante,
  cargandoMP,
  errorMP,
  onPagarMP,
  resumen,
  whatsapp,
  onVolver,
}: {
  cotizacion: number;
  nombre: string;
  pago: Pago;
  monto: number;
  // Total a pagar en 3 cuotas (= monto cuando pago === 'cuotas'), ya
  // dividido por 3 — misma fuente que la Home (cuotaDeLista en
  // src/lib/precios.ts).
  cuota: number;
  comprobanteRecibido?: boolean;
  enviandoAviso: boolean;
  onEnviarComprobante: () => void;
  cargandoMP: boolean;
  errorMP: string;
  onPagarMP: () => void;
  resumen?: string[];
  whatsapp: string | null;
  onVolver: () => void;
}) {
  const [copiado, setCopiado] = useState<'alias' | 'monto' | null>(null);
  // C4 (16-nov): se eliminó la subida de archivo — el comprobante va por
  // WhatsApp. Este flag solo controla cuándo aparece "Ya envié el
  // comprobante" (recién después de que tocó el botón de WhatsApp).
  const [whatsappAbierto, setWhatsappAbierto] = useState(false);
  const aliasRef = useRef<HTMLParagraphElement>(null);
  const montoRef = useRef<HTMLParagraphElement>(null);

  // Sin permiso/soporte de clipboard: selecciona el texto para que lo
  // copien a mano (Ctrl/Cmd+C) en vez de fallar en silencio.
  function seleccionarTexto(el: HTMLElement | null) {
    if (!el) return;
    const seleccion = window.getSelection();
    const rango = document.createRange();
    rango.selectNodeContents(el);
    seleccion?.removeAllRanges();
    seleccion?.addRange(rango);
  }

  async function copiar(texto: string, que: 'alias' | 'monto', el: HTMLElement | null) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      seleccionarTexto(el);
    }
  }

  const mensajeComprobante = mensajeComprobanteTransferencia({ nombre, monto, cotizacion });
  const linkComprobanteWhatsApp = whatsapp ? linkWhatsApp(whatsapp, mensajeComprobante) : null;

  return (
    <>
      {pago === 'transferencia' ? (
        <>
          <h2 className="font-sans text-[26px] font-bold tabular-nums text-tinta">
            Transferí {formatoPeso(monto)} a este alias
          </h2>
          <p className="mt-2 text-[15px] text-[#475569]">
            1. Copiá el alias o el monto y transferí desde tu banco o billetera.
          </p>

          {comprobanteRecibido && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-[14px] leading-relaxed text-violet-900">
              <b>Ya nos avisaste que transferiste</b> — lo estamos verificando. Si necesitás
              avisarnos de nuevo (por ejemplo, si transferiste otra vez), podés hacerlo por
              WhatsApp las veces que haga falta.
            </div>
          )}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-4">
              <div>
                <p ref={aliasRef} className="font-archivo text-[34px] font-extrabold leading-none tracking-tight text-navy">
                  {ALIAS}
                </p>
                <p className="mt-1 text-xs text-[#475569]">{TITULAR}</p>
              </div>
              <button
                className="flex items-center gap-1.5 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3d8ee7]"
                onClick={() => copiar(ALIAS, 'alias', aliasRef.current)}
              >
                {copiado === 'alias' && <IconCheck className="h-4 w-4" circulo={false} />}
                {copiado === 'alias' ? 'Copiado' : 'Copiar alias'}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-4">
              <p ref={montoRef} className="tabular-nums text-[20px] font-extrabold text-tinta">
                {formatoPeso(monto)}
              </p>
              <button
                className="flex items-center gap-1.5 rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3d8ee7]"
                onClick={() => copiar(String(Math.round(monto)), 'monto', montoRef.current)}
              >
                {copiado === 'monto' && <IconCheck className="h-4 w-4" circulo={false} />}
                {copiado === 'monto' ? 'Copiado' : 'Copiar monto'}
              </button>
            </div>

            <p className="pt-2 text-[18px] text-tinta">2. Cuando termines, avisanos por WhatsApp con el comprobante:</p>
            {linkComprobanteWhatsApp && (
              <a
                href={linkComprobanteWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-siguiente"
                onClick={() => setWhatsappAbierto(true)}
              >
                Enviar comprobante por WhatsApp
              </a>
            )}
            <p className="text-center text-[14px] text-[#475569]">
              Cuando lo recibamos, te confirmamos el pago por WhatsApp.
            </p>

            {whatsappAbierto && (
              <button
                className="btn-volver disabled:cursor-not-allowed disabled:opacity-50"
                disabled={enviandoAviso}
                onClick={onEnviarComprobante}
              >
                {enviandoAviso ? 'Avisando…' : 'Ya envié el comprobante'}
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {pago === 'cuotas' ? (
            <h2 className="font-sans text-[26px] font-bold tabular-nums text-tinta">
              Vas a pagar 3 cuotas de {formatoPeso(cuota)} con Mercado Pago
              <br className="sm:hidden" /> · Total {formatoPeso(monto)}
            </h2>
          ) : (
            <>
              <h2 className="font-sans text-[26px] font-bold tabular-nums text-tinta">
                Vas a pagar {formatoPeso(monto)} con Mercado Pago
              </h2>
              <p className="mt-1 text-[14px] text-[#475569]">
                El 15% de descuento aplica pagando con dinero en cuenta o tarjeta de débito.
              </p>
            </>
          )}
          {resumen && resumen.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#f1f5fa] p-4 text-[14px] tabular-nums leading-relaxed text-[#475569]">
              {resumen.map((linea) => (
                <p key={linea}>{linea}</p>
              ))}
            </div>
          )}
          <div className="mt-5">
            <button className="btn-siguiente disabled:cursor-not-allowed disabled:opacity-50" disabled={cargandoMP} onClick={onPagarMP}>
              {cargandoMP ? 'Preparando el pago…' : 'Ir a pagar'}
            </button>
            {errorMP && (
              <p className="mt-3 text-center text-[16px] font-medium text-red-600" role="alert">
                {errorMP}
              </p>
            )}
          </div>
        </>
      )}

      <PasoFooter onVolver={onVolver} whatsapp={whatsapp} cotizacion={cotizacion} />
    </>
  );
}
