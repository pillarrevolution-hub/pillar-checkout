import { formatoPeso } from '@/lib/firma';
import { validarCelular, CELULAR_ERROR } from '@/lib/celular';
import { CelularCampo, PasoFooter, PasoHeader, Radio, placeholderComentarios } from './ui';

export type Pago = 'transferencia' | 'mp' | 'cuotas';

export default function Paso3Pago({
  cotizacion,
  recibe,
  barraTexto,
  totalMostrado,
  contado,
  cuota,
  pago,
  onElegirPago,
  celular,
  setCelular,
  celularDeMalvinas,
  referencias,
  setReferencias,
  onBlurGuardar,
  whatsapp,
  errorContacto,
  onReintentarContacto,
  onSiguiente,
  onVolver,
}: {
  cotizacion: number;
  // Solo para el placeholder de "Comentarios" (C2): Envío sugiere piso
  // /depto/timbre, retiro sugiere cualquier otra cosa que haga falta
  // saber.
  recibe: 'retiro' | 'envio' | null;
  barraTexto: string;
  totalMostrado: number;
  contado: number;
  cuota: number;
  pago: Pago;
  onElegirPago: (p: Pago) => void;
  celular: string;
  setCelular: (v: string) => void;
  celularDeMalvinas?: string;
  referencias: string;
  setReferencias: (v: string) => void;
  onBlurGuardar: () => void;
  whatsapp: string | null;
  errorContacto?: boolean;
  onReintentarContacto?: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}) {
  const celularOk = validarCelular(celular).ok;
  // Error recién a partir de 6 dígitos tipeados — antes de eso está
  // simplemente incompleto, no hace falta marcarlo como inválido.
  const celularError =
    !celularOk && celular.replace(/\D/g, '').length >= 6 ? CELULAR_ERROR : undefined;

  return (
    <>
      <PasoHeader paso={2} />
      <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿Cómo querés pagar?</h2>

      <div className="mt-5 space-y-3">
        <CelularCampo celular={celular} setCelular={setCelular} onBlur={onBlurGuardar} celularDeMalvinas={celularDeMalvinas} error={celularError} />
        <div>
          <label className="label-paso" htmlFor="comentarios">
            Comentarios <span className="font-normal text-[#475569]">(opcional)</span>
          </label>
          <textarea
            id="comentarios"
            className="input-paso"
            rows={2}
            placeholder={placeholderComentarios(recibe)}
            value={referencias}
            onChange={(e) => setReferencias(e.target.value)}
            onBlur={onBlurGuardar}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-navy px-4 py-3.5 text-white" aria-live="polite">
        <span className="text-[15px] font-medium text-slate-200">{barraTexto}</span>
        <span className="tabular-nums text-[18px] font-bold">{formatoPeso(totalMostrado)}</span>
      </div>

      <div className="mt-4 space-y-3" role="radiogroup" aria-label="¿Cómo querés pagar?">
        <button
          className={`opcion ${pago === 'transferencia' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => onElegirPago('transferencia')}
          role="radio"
          aria-checked={pago === 'transferencia'}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'transferencia'} />
            <span>
              <span className="block tabular-nums text-[19px] font-bold text-tinta">Transferencia — {formatoPeso(contado)}</span>
              <span className="block text-[15px] text-[#475569]">
                Con 15% de descuento. Te mostramos el alias.
              </span>
            </span>
          </span>
        </button>
        <button
          className={`opcion ${pago === 'mp' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => onElegirPago('mp')}
          role="radio"
          aria-checked={pago === 'mp'}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'mp'} />
            <span>
              <span className="block tabular-nums text-[19px] font-bold text-tinta">Mercado Pago — {formatoPeso(contado)}</span>
              <span className="block text-[15px] text-[#475569]">
                Con 15% de descuento. Dinero en cuenta o débito.
              </span>
            </span>
          </span>
        </button>
        <button
          className={`opcion ${pago === 'cuotas' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => onElegirPago('cuotas')}
          role="radio"
          aria-checked={pago === 'cuotas'}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'cuotas'} />
            <span>
              <span className="block tabular-nums text-[19px] font-bold text-tinta">3 cuotas de {formatoPeso(cuota)}</span>
              <span className="block text-[15px] text-[#475569]">Sin interés, con tarjeta de crédito.</span>
            </span>
          </span>
        </button>
      </div>

      <PasoFooter
        onSiguiente={onSiguiente}
        siguienteDeshabilitado={!celularOk}
        falta="Falta tu celular"
        onVolver={onVolver}
        whatsapp={whatsapp}
        cotizacion={cotizacion}
        errorContacto={errorContacto}
        onReintentarContacto={onReintentarContacto}
      />
    </>
  );
}
