import { formatoPeso } from '@/lib/firma';
import { PasoFooter, PasoHeader, Radio } from './ui';

export type Pago = 'transferencia' | 'mp' | 'cuotas';

export default function Paso3Pago({
  cotizacion,
  barraTexto,
  totalMostrado,
  contado,
  cuota,
  pago,
  onElegirPago,
  whatsapp,
  errorContacto,
  onReintentarContacto,
  onSiguiente,
  onVolver,
}: {
  cotizacion: number;
  barraTexto: string;
  totalMostrado: number;
  contado: number;
  cuota: number;
  pago: Pago;
  onElegirPago: (p: Pago) => void;
  whatsapp: string | null;
  errorContacto?: boolean;
  onReintentarContacto?: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}) {
  return (
    <div className="tarjeta fade-paso flex min-h-[520px] flex-col">
      <PasoHeader paso={3} />
      <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿Cómo querés pagar?</h2>

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
        onVolver={onVolver}
        whatsapp={whatsapp}
        cotizacion={cotizacion}
        errorContacto={errorContacto}
        onReintentarContacto={onReintentarContacto}
      />
    </div>
  );
}
