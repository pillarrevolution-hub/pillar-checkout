import { useState } from 'react';
import { linkWhatsApp } from '@/lib/datos';
import { validarCelular, formatoCelular } from '@/lib/celular';

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

// Cabecera del paso a paso: "PASO N DE 3" + 3 barritas de progreso. C2
// (14-nov): bajó de 4 a 3 — el viejo Paso 2 (campos de la modalidad) se
// fusionó con el Paso 1 (acordeón) y con "¿Cómo querés pagar?" (celular +
// comentarios), así que el flujo numerado queda Recibir → Pago → Pagar.
export function PasoHeader({ paso }: { paso: 1 | 2 | 3 }) {
  return (
    <div>
      <p className="text-[13px] font-bold uppercase tracking-[0.1em] text-[#2f6fbd]">Paso {paso} de 3</p>
      <div className="mt-2 flex gap-1.5">
        {[1, 2, 3].map((n) => (
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
// errorContacto: guardarContacto falló silenciosamente (no bloquea avanzar,
// pero avisa y deja reintentar a mano).
export function PasoFooter({
  onSiguiente,
  siguienteDeshabilitado,
  falta,
  onVolver,
  volverLabel = 'Volver',
  whatsapp,
  cotizacion,
  errorContacto,
  onReintentarContacto,
}: {
  onSiguiente?: () => void;
  siguienteDeshabilitado?: boolean;
  falta?: string;
  onVolver: () => void;
  volverLabel?: string;
  whatsapp: string | null;
  cotizacion: number;
  errorContacto?: boolean;
  onReintentarContacto?: () => void;
}) {
  return (
    <div className="mt-auto space-y-3 pt-6">
      {onSiguiente && (
        <>
          <button className="btn-siguiente" disabled={siguienteDeshabilitado} onClick={onSiguiente}>
            Siguiente
          </button>
          {siguienteDeshabilitado && falta && (
            <p className="text-center text-[16px] font-medium text-amber-700" aria-live="polite">
              {falta}
            </p>
          )}
        </>
      )}
      {errorContacto && (
        <div className="aviso-error flex flex-wrap items-center justify-between gap-2" role="alert">
          <span>No pudimos guardar tus datos, reintentá.</span>
          <button
            className="min-h-[44px] rounded-lg border border-amber-400 bg-white px-4 py-2.5 font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
            onClick={onReintentarContacto}
          >
            Reintentar
          </button>
        </div>
      )}
      <button className="btn-volver" onClick={onVolver}>
        {volverLabel}
      </button>
      <AyudaWhatsApp whatsapp={whatsapp} cotizacion={cotizacion} />
    </div>
  );
}

// Celular (A3): campo editable, o línea de solo lectura cuando Malvinas
// ya lo tiene cargado en la ficha del paciente — movido de Paso2Datos.tsx
// a este archivo compartido en C2 (14-nov), porque ahora lo usa el paso
// de Pago en vez de un paso de "Datos" propio.
export function CelularCampo({
  celular,
  setCelular,
  onBlur,
  celularDeMalvinas,
  error,
}: {
  celular: string;
  setCelular: (v: string) => void;
  onBlur: () => void;
  celularDeMalvinas?: string;
  error?: string;
}) {
  const [editar, setEditar] = useState(false);

  if (celularDeMalvinas && !editar) {
    const normalizado = validarCelular(celularDeMalvinas).normalizado;
    return (
      <p className="text-[15px] text-tinta">
        Te avisamos al {normalizado ? formatoCelular(normalizado) : celularDeMalvinas} ·{' '}
        <button
          type="button"
          className="link-tap font-semibold text-[#2f6fbd] underline"
          onClick={() => setEditar(true)}
        >
          ¿No es tu número? Cambiarlo
        </button>
      </p>
    );
  }

  return (
    <div>
      <label className="label-paso" htmlFor="celular">
        Tu celular
      </label>
      <input
        id="celular"
        className="input-paso"
        inputMode="tel"
        placeholder="Con código de área, ej. 351 555 0000"
        value={celular}
        onChange={(e) => setCelular(e.target.value)}
        onBlur={onBlur}
      />
      {error && (
        <p className="mt-1.5 text-[13px] font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Comentarios (C2, 14-nov): un solo campo genérico para las 4
// modalidades (antes había dos campos duplicados sobre el mismo dato:
// "Comentarios" en Badra y "Referencias para la entrega o comentarios"
// en Envío). El placeholder cambia según la modalidad para que la
// pregunta tenga sentido en cada caso.
export function placeholderComentarios(recibe: 'retiro' | 'envio' | null): string {
  return recibe === 'envio'
    ? 'Piso, depto, timbre o referencias para la entrega'
    : '¿Algo que tengamos que saber? (opcional)';
}
