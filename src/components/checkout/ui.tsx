import { linkWhatsApp } from '@/lib/datos';

export function Radio({ activo }: { activo: boolean }) {
  return (
    <span className={`radio relative ${activo ? 'border-[#3d8ee7]' : 'border-slate-300'} bg-white`}>
      {activo && <span className="absolute inset-[3px] rounded-full bg-[#3d8ee7]" />}
    </span>
  );
}

export function RadioChico({ activo }: { activo: boolean }) {
  return (
    <span className={`radio-chico relative ${activo ? 'border-[#3d8ee7]' : 'border-slate-300'} bg-white`}>
      {activo && <span className="absolute inset-[2.5px] rounded-full bg-[#3d8ee7]" />}
    </span>
  );
}

// Cabecera del paso a paso: "PASO N DE 4" + 4 barritas de progreso.
export function PasoHeader({ paso }: { paso: 1 | 2 | 3 | 4 }) {
  return (
    <div>
      <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#2f6fbd]">Paso {paso} de 4</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={`h-[6px] w-[34px] rounded-full ${n <= paso ? 'bg-[#3d8ee7]' : 'bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function AyudaWhatsApp({ whatsapp, cotizacion }: { whatsapp: string | null; cotizacion: number }) {
  if (!whatsapp) return null;
  return (
    <a
      href={linkWhatsApp(whatsapp, `Hola! Necesito ayuda con el pago de mi tratamiento — cotización #${cotizacion}`)}
      className="wa-ayuda"
      target="_blank"
      rel="noopener noreferrer"
    >
      ¿Necesitás ayuda? Escribinos por WhatsApp
    </a>
  );
}

// Footer estándar de cada paso: Siguiente + Volver + ayuda por WhatsApp.
export function PasoFooter({
  onSiguiente,
  siguienteDeshabilitado,
  falta,
  onVolver,
  volverLabel = 'Volver',
  whatsapp,
  cotizacion,
}: {
  onSiguiente?: () => void;
  siguienteDeshabilitado?: boolean;
  falta?: string;
  onVolver: () => void;
  volverLabel?: string;
  whatsapp: string | null;
  cotizacion: number;
}) {
  return (
    <div className="mt-auto space-y-3 pt-6">
      {onSiguiente && (
        <>
          <button className="btn-siguiente" disabled={siguienteDeshabilitado} onClick={onSiguiente}>
            Siguiente
          </button>
          {siguienteDeshabilitado && falta && (
            <p className="text-center text-[16px] font-medium text-amber-700">{falta}</p>
          )}
        </>
      )}
      <button className="btn-volver" onClick={onVolver}>
        {volverLabel}
      </button>
      <AyudaWhatsApp whatsapp={whatsapp} cotizacion={cotizacion} />
    </div>
  );
}
