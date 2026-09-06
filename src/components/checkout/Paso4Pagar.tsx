'use client';
import { useRef, useState } from 'react';
import { formatoPeso } from '@/lib/firma';
import { PasoFooter } from './ui';
import { IconCheck } from '../icons';
import type { Pago } from './Paso3Pago';

const ALIAS = 'pill.ar';
const TITULAR = 'PILL.AR S.A. · CUIT 30-71816734-1';

export default function Paso4Pagar({
  cotizacion,
  pago,
  monto,
  comprobanteRecibido,
  subiendo,
  errorComprobante,
  onEnviarComprobante,
  cargandoMP,
  errorMP,
  onPagarMP,
  resumen,
  whatsapp,
  onVolver,
}: {
  cotizacion: number;
  pago: Pago;
  monto: number;
  comprobanteRecibido?: boolean;
  subiendo: boolean;
  errorComprobante: string;
  onEnviarComprobante: (archivo: File) => void;
  cargandoMP: boolean;
  errorMP: string;
  onPagarMP: () => void;
  resumen?: string[];
  whatsapp: string | null;
  onVolver: () => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [copiado, setCopiado] = useState<'alias' | 'monto' | null>(null);
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

  return (
    <div className="tarjeta fade-paso">
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
              <b>Ya recibimos un comprobante tuyo</b> — lo estamos verificando. Si subís otro (por
              ejemplo, si el primero salió mal), lo tomamos como el vigente.
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

            <p className="pt-2 text-[18px] text-tinta">2. Cuando termines, subí la foto del comprobante:</p>
            <label
              className={`block cursor-pointer rounded-[14px] border-2 border-dashed p-6 text-center text-[15px] transition-colors focus-within:ring-2 focus-within:ring-[#3d8ee7] ${
                archivo ? 'border-green-400 bg-green-50 text-green-800' : 'border-slate-300 text-[#475569] hover:border-[#3d8ee7]'
              }`}
            >
              {archivo ? archivo.name : 'Elegir foto o PDF'}
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                className="sr-only"
                onChange={(e) => {
                  setArchivo(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            <button
              className="btn-siguiente disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!archivo || subiendo}
              onClick={() => archivo && onEnviarComprobante(archivo)}
            >
              {subiendo ? 'Enviando…' : 'Enviar comprobante'}
            </button>
            {errorComprobante && (
              <p className="text-center text-[16px] font-medium text-red-600" role="alert">
                {errorComprobante}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <h2 className="font-sans text-[26px] font-bold tabular-nums text-tinta">
            Vas a pagar {formatoPeso(monto)} con Mercado Pago
          </h2>
          {resumen && resumen.length > 0 && (
            <div className="mt-4 rounded-xl bg-[#f1f5fa] p-4 text-[14px] leading-relaxed text-[#475569]">
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
    </div>
  );
}
