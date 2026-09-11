import { linkWhatsApp } from '@/lib/datos';
import { formatoPeso } from '@/lib/firma';
import type { FarmaciaRed } from '@/lib/farmaciasRed';
import { IconCheck } from '../icons';

export default function Paso5Confirmacion({
  nombre,
  monto,
  recibo,
  celular,
  mensajeWhatsApp,
  whatsapp,
  farmaciaRedInfo,
}: {
  nombre: string;
  monto: number;
  recibo: string;
  celular: string;
  mensajeWhatsApp: string;
  whatsapp: string | null;
  farmaciaRedInfo?: FarmaciaRed;
}) {
  return (
    <div className="tarjeta fade-paso text-center">
      <div className="mb-3 flex justify-center">
        <IconCheck className="h-12 w-12" />
      </div>
      <h1 className="font-sans text-3xl font-bold text-tinta">¡Listo, {nombre}!</h1>
      <p className="mt-1 text-[18px] font-semibold text-tinta">Recibimos tu comprobante.</p>
      <p className="mt-2 text-[15px] leading-relaxed text-slate-600">
        Lo verificamos y te confirmamos por WhatsApp. Ahí mismo empieza la elaboración de tu
        tratamiento.
      </p>

      <div className="mt-5 rounded-xl bg-[#f1f5fa] p-4 text-left text-[14px] tabular-nums leading-relaxed text-[#475569]">
        <p>Recibís: {recibo}</p>
        {farmaciaRedInfo && (
          <p className="text-[13px] text-[#64748b]">
            {farmaciaRedInfo.direccion} · {farmaciaRedInfo.horario} ·{' '}
            <a href={`tel:${farmaciaRedInfo.telefonoE164}`} className="underline">
              {farmaciaRedInfo.telefono}
            </a>
          </p>
        )}
        <p>Pagaste: {formatoPeso(monto)} por transferencia</p>
        {celular && <p>Te avisamos al: {celular}</p>}
      </div>

      {whatsapp && (
        <a href={linkWhatsApp(whatsapp, mensajeWhatsApp)} className="wa-ayuda mt-5" target="_blank" rel="noopener noreferrer">
          Si querés, avisanos por WhatsApp para que lo veamos más rápido (no es necesario)
        </a>
      )}
      <p className="mt-4 text-[13px] text-[#475569]">
        Podés cerrar esta página. Guardá el link por si querés volver a verla.
      </p>
    </div>
  );
}
