import { linkWhatsApp } from '@/lib/datos';
import { PasoFooter, PasoHeader, Radio, RadioChico } from './ui';

export default function Paso1Recibir({
  cotizacion,
  hayEnvios,
  recibe,
  retiroModo,
  whatsapp,
  onElegirRecibe,
  onElegirRetiroModo,
  onSiguiente,
  onVolver,
}: {
  cotizacion: number;
  hayEnvios: boolean;
  recibe: 'retiro' | 'envio' | null;
  retiroModo: 'red' | 'colegio' | '';
  whatsapp: string | null;
  onElegirRecibe: (r: 'retiro' | 'envio') => void;
  onElegirRetiroModo: (m: 'red' | 'colegio') => void;
  onSiguiente: () => void;
  onVolver: () => void;
}) {
  const puedeAvanzar = recibe === 'envio' || (recibe === 'retiro' && !!retiroModo);

  return (
    <div className="tarjeta fade-paso flex min-h-[520px] flex-col">
      <PasoHeader paso={1} />
      <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿Cómo querés recibirlo?</h2>

      <div className="mt-5 space-y-3">
        <button
          className={`opcion ${recibe === 'retiro' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => onElegirRecibe('retiro')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'retiro'} />
            <span>
              <span className="block text-[19px] font-bold text-tinta">Lo retiro en una farmacia</span>
              <span className="block text-[15px] text-[#475569]">Sin cargo.</span>
            </span>
          </span>
        </button>

        {recibe === 'retiro' && (
          <div className="ml-6 space-y-2">
            <button
              className={`opcion-chica ${retiroModo === 'red' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              onClick={() => onElegirRetiroModo('red')}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <RadioChico activo={retiroModo === 'red'} />
                  <span>
                    <span className="block text-[15px] font-bold text-tinta">Córdoba capital</span>
                    <span className="block text-[13px] text-[#475569]">En una Farmacia RED, la que elijas.</span>
                  </span>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/farmacias-red.png" alt="Farmacias RED" className="h-14 shrink-0" />
              </span>
            </button>
            <button
              className={`opcion-chica ${retiroModo === 'colegio' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              onClick={() => onElegirRetiroModo('colegio')}
            >
              <span className="flex items-center gap-2.5">
                <RadioChico activo={retiroModo === 'colegio'} />
                <span>
                  <span className="block text-[15px] font-bold text-tinta">Interior de Córdoba</span>
                  <span className="block text-[13px] text-[#475569]">
                    En una farmacia de tu localidad, vía Colegio de Farmacéuticos.
                  </span>
                </span>
              </span>
            </button>
          </div>
        )}

        {hayEnvios ? (
          <button
            className={`opcion ${recibe === 'envio' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            onClick={() => onElegirRecibe('envio')}
          >
            <span className="flex items-start gap-3">
              <Radio activo={recibe === 'envio'} />
              <span>
                <span className="block text-[19px] font-bold text-tinta">Me lo mandan a casa</span>
                <span className="block text-[15px] text-[#475569]">
                  Te decimos cuánto cuesta y cuánto demora el envío a tu localidad.
                </span>
              </span>
            </span>
          </button>
        ) : (
          <div className="opcion cursor-not-allowed border-slate-200 bg-slate-50 opacity-70">
            <span className="flex items-start gap-3">
              <Radio activo={false} />
              <span>
                <span className="block text-[19px] font-bold text-slate-400">Me lo mandan a casa</span>
                <span className="block text-[15px] text-[#475569]">
                  {whatsapp ? (
                    <a
                      href={linkWhatsApp(whatsapp, `Hola! Necesito el link actualizado del checkout para envío a domicilio — cotización #${cotizacion}`)}
                      className="underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Pedinos el link actualizado por WhatsApp para envío a domicilio
                    </a>
                  ) : (
                    'Pedinos el link actualizado por WhatsApp para envío a domicilio'
                  )}
                </span>
              </span>
            </span>
          </div>
        )}
      </div>

      <PasoFooter
        onSiguiente={onSiguiente}
        siguienteDeshabilitado={!puedeAvanzar}
        falta={recibe === 'retiro' ? 'Elegí Córdoba capital o interior de la provincia' : 'Elegí cómo querés recibirlo'}
        onVolver={onVolver}
        volverLabel="Volver al inicio"
        whatsapp={whatsapp}
        cotizacion={cotizacion}
      />
    </div>
  );
}
