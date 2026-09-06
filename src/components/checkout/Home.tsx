import { formatoPeso } from '@/lib/firma';
import { linkWhatsApp } from '@/lib/datos';

export default function Home({
  nombre,
  li,
  contado,
  cuotaSinEnvio,
  whatsapp,
  comprobanteRecibido,
  comprobanteListo,
  onEmpezar,
}: {
  nombre: string;
  li: number;
  contado: number;
  cuotaSinEnvio: number;
  whatsapp: string | null;
  comprobanteRecibido: boolean;
  comprobanteListo: boolean;
  onEmpezar: () => void;
}) {
  return (
    <div className="tarjeta">
      <span className="chip">Cotización personalizada</span>
      <h1 className="mt-3 font-sans text-[32px] font-bold leading-tight text-tinta">Hola, {nombre}.</h1>
      <p className="mt-2 text-[15px] text-slate-500">
        Tu tratamiento personalizado ya está cotizado. Elaborado por Nueva Farmacia Badra con
        tecnología PILL.AR.
      </p>

      {comprobanteRecibido && !comprobanteListo && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-[14px] leading-relaxed text-violet-900">
          <b>Ya recibimos tu comprobante</b> — lo estamos verificando y te confirmamos por
          WhatsApp. Si necesitás subir otro (por ejemplo, si el primero salió mal), podés hacerlo
          de nuevo siguiendo los mismos pasos.
        </div>
      )}

      <div className="mt-5 rounded-2xl bg-gradient-to-b from-[#0f2036] to-navy p-5 text-white">
        <p className="text-[15px] text-slate-300">
          Valor del tratamiento: <s className="tabular-nums text-slate-400">{formatoPeso(li)}</s>
        </p>
        <p className="mt-1">
          <span className="font-sans text-[40px] font-bold tabular-nums leading-none">{formatoPeso(contado)}</span>
        </p>
        <p className="mt-1 text-sm text-slate-300">pagando de contado</p>
        <span className="mt-3 inline-block rounded-full bg-[#f2c94c] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1c2430]">
          15% de descuento pagando de contado
        </span>
        <p className="mt-3 text-[13px] text-slate-300">
          o 3 cuotas sin interés de <span className="tabular-nums">{formatoPeso(cuotaSinEnvio)}</span>
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {['Elegís cómo recibirlo', 'Dejás tus datos', 'Elegís cómo pagarlo'].map((texto, i) => (
          <div key={texto} className="flex items-center gap-3">
            <span className="paso">{i + 1}</span>
            <span className="text-[15px] font-medium text-tinta">{texto}</span>
          </div>
        ))}
      </div>

      <button
        className="mt-6 block w-full rounded-[14px] bg-[#f2c94c] px-5 py-5 text-center text-[21px] font-extrabold text-[#1c2430] transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#3d8ee7]"
        onClick={onEmpezar}
      >
        Pagar mi tratamiento
      </button>
      <p className="mt-2 text-center text-[13px] text-[#475569]">Te lleva 2 minutos.</p>

      {whatsapp && (
        <a
          href={linkWhatsApp(whatsapp, '¡Hola! Tengo una duda antes de pagar mi tratamiento 🙂')}
          className="wa-ayuda mt-5"
          target="_blank"
          rel="noopener noreferrer"
        >
          ¿Tenés dudas antes de pagar? Escribinos por WhatsApp
        </a>
      )}
    </div>
  );
}
