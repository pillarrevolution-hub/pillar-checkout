import { linkWhatsApp } from '@/lib/datos';
import { formatoPeso } from '@/lib/firma';
import { buscarTarifa, sugerirTarifas, tituloLocalidad, type TarifaEnvio } from '@/lib/envios';
import { FARMACIAS_RED } from '@/lib/farmaciasRed';
import { PasoFooter, PasoHeader } from './ui';
import { IconCheck, IconClock, IconMail, IconPhone, IconPin } from '../icons';

const celularOk = (v: string) => v.replace(/\D/g, '').length >= 6;

export default function Paso2Datos({
  cotizacion,
  recibe,
  retiroModo,
  tarifas,
  leyendaEnvio,
  envioAdentro,
  localidades,
  whatsapp,
  errorContacto,
  onReintentarContacto,
  farmaciaRed,
  setFarmaciaRed,
  colegioLocalidad,
  setColegioLocalidad,
  envioLocalidadTexto,
  setEnvioLocalidadTexto,
  calle,
  setCalle,
  piso,
  setPiso,
  cp,
  setCp,
  referencias,
  setReferencias,
  celular,
  setCelular,
  onBlurGuardar,
  onIrARetiro,
  onSiguiente,
  onVolver,
}: {
  cotizacion: number;
  recibe: 'retiro' | 'envio';
  retiroModo: 'red' | 'colegio' | '';
  tarifas: TarifaEnvio[];
  leyendaEnvio: string;
  envioAdentro?: boolean;
  localidades: readonly string[];
  whatsapp: string | null;
  errorContacto?: boolean;
  onReintentarContacto?: () => void;
  farmaciaRed: string;
  setFarmaciaRed: (v: string) => void;
  colegioLocalidad: string;
  setColegioLocalidad: (v: string) => void;
  envioLocalidadTexto: string;
  setEnvioLocalidadTexto: (v: string) => void;
  calle: string;
  setCalle: (v: string) => void;
  piso: string;
  setPiso: (v: string) => void;
  cp: string;
  setCp: (v: string) => void;
  referencias: string;
  setReferencias: (v: string) => void;
  celular: string;
  setCelular: (v: string) => void;
  onBlurGuardar: () => void;
  onIrARetiro: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}) {
  const tarifaEncontrada = recibe === 'envio' ? buscarTarifa(envioLocalidadTexto, tarifas) : null;
  const sugerencias = recibe === 'envio' ? sugerirTarifas(envioLocalidadTexto, tarifas, 6) : [];
  const noEncontrada = recibe === 'envio' && envioLocalidadTexto.trim().length >= 3 && !tarifaEncontrada;

  let puedeAvanzar = false;
  let falta = '';
  if (recibe === 'retiro' && retiroModo === 'red') {
    puedeAvanzar = !!farmaciaRed && celularOk(celular);
    falta = !farmaciaRed ? 'Elegí en qué Farmacia RED lo retirás' : 'Falta tu celular';
  } else if (recibe === 'retiro' && retiroModo === 'colegio') {
    puedeAvanzar = colegioLocalidad.trim().length >= 2 && celularOk(celular);
    falta = colegioLocalidad.trim().length < 2 ? 'Falta la localidad donde retirás' : 'Falta tu celular';
  } else if (recibe === 'envio') {
    puedeAvanzar = !!tarifaEncontrada && calle.trim().length >= 4 && celularOk(celular) && !noEncontrada;
    falta = !envioLocalidadTexto.trim()
      ? 'Falta la localidad de envío'
      : !tarifaEncontrada
        ? 'Elegí una localidad de la lista de sugerencias'
        : calle.trim().length < 4
          ? 'Falta la calle y el número'
          : 'Falta tu celular';
  }

  return (
    <div className="tarjeta fade-paso flex min-h-[520px] flex-col">
      <PasoHeader paso={2} />

      {recibe === 'retiro' && retiroModo === 'red' && (
        <>
          <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿En qué Farmacia RED lo retirás?</h2>
          <div className="mt-5 space-y-3">
            <div>
              <label className="label-paso" htmlFor="farmacia-red">
                Sucursal
              </label>
              <select
                id="farmacia-red"
                className="input-paso"
                value={farmaciaRed}
                onChange={(e) => setFarmaciaRed(e.target.value)}
                onBlur={onBlurGuardar}
              >
                <option value="">Elegí una sucursal…</option>
                {FARMACIAS_RED.map((f) => (
                  <option key={f.nombre} value={f.nombre}>
                    {f.nombre} — {f.direccion}
                  </option>
                ))}
              </select>
            </div>
            {farmaciaRed &&
              (() => {
                const suc = FARMACIAS_RED.find((f) => f.nombre === farmaciaRed);
                if (!suc) return null;
                return (
                  <div className="rounded-[14px] bg-slate-50 p-4" aria-live="polite">
                    <p className="text-[15px] text-[#475569]">
                      Para consultar por tu pedido o saber si ya llegó:
                    </p>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-start gap-2.5">
                        <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                        <div>
                          <p className="text-[16px] font-semibold text-tinta">{suc.direccion}</p>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suc.mapsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="-mx-1 -my-3 inline-block px-1 py-3 text-[15px] font-medium text-[#2f6fbd] underline"
                          >
                            Ver en el mapa
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <IconClock className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                        <p className="text-[16px] text-tinta">{suc.horario}</p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <IconPhone className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                        <a
                          href={`tel:${suc.telefonoE164}`}
                          className="-mx-1 -my-3 inline-block px-1 py-3 text-[16px] font-medium text-[#2f6fbd] underline"
                        >
                          {suc.telefono}
                        </a>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <IconMail className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                        <a
                          href={`mailto:${suc.mail}`}
                          className="-mx-1 -my-3 inline-block break-all px-1 py-3 text-[16px] font-medium text-[#2f6fbd] underline"
                        >
                          {suc.mail}
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })()}
            <p className="text-[15px] leading-relaxed text-[#475569]">
              Cuando esté listo te avisamos por WhatsApp y lo dejamos en esa farmacia a tu nombre.
            </p>
            <Celular celular={celular} setCelular={setCelular} onBlur={onBlurGuardar} />
          </div>
        </>
      )}

      {recibe === 'retiro' && retiroModo === 'colegio' && (
        <>
          <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿En qué localidad lo retirás?</h2>
          <div className="mt-5 space-y-3">
            <div>
              <label className="label-paso" htmlFor="colegio-localidad">
                Localidad
              </label>
              <input
                id="colegio-localidad"
                className="input-paso"
                list="localidades-colegio"
                placeholder="Ej: Alta Gracia"
                value={colegioLocalidad}
                onChange={(e) => setColegioLocalidad(e.target.value)}
                onBlur={onBlurGuardar}
              />
              <datalist id="localidades-colegio">
                {localidades.map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>
            <div className="rounded-xl bg-[#eaf3fd] p-4 text-[15px] leading-relaxed text-[#2d5175]">
              A través de un convenio con el Colegio de Farmacéuticos de la Provincia de Córdoba te
              informaremos en cuál farmacia de tu localidad podrás retirar cuando ya esté elaborado
              tu pedido.
              <p className="mt-2 font-bold">
                Un detalle: el Colegio hace el reparto cada 15 días, así que este retiro puede
                demorar un poco más que el envío a domicilio.
              </p>
            </div>
            <Celular celular={celular} setCelular={setCelular} onBlur={onBlurGuardar} />
          </div>
        </>
      )}

      {recibe === 'envio' && (
        <>
          <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿A dónde lo mandamos?</h2>
          <div className="mt-5 space-y-3">
            <div>
              <label className="label-paso" htmlFor="envio-localidad">
                Localidad
              </label>
              <div className="relative">
                <input
                  id="envio-localidad"
                  className="input-paso"
                  list="localidades-envio"
                  autoComplete="off"
                  placeholder="Ej: Alta Gracia"
                  value={envioLocalidadTexto}
                  onChange={(e) => setEnvioLocalidadTexto(e.target.value)}
                  onBlur={onBlurGuardar}
                />
                {tarifaEncontrada && (
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                    <IconCheck className="h-5 w-5" circulo={false} />
                  </span>
                )}
              </div>
              <datalist id="localidades-envio">
                {sugerencias.map((t) => (
                  <option key={t.l} value={tituloLocalidad(t.l)} />
                ))}
              </datalist>
            </div>

            {tarifaEncontrada && envioAdentro && (
              <div className="rounded-xl bg-[#eaf3fd] p-4 text-[#2d5175]" aria-live="polite">
                <p className="tabular-nums text-[18px] font-bold">Envío incluido en el precio</p>
              </div>
            )}

            {tarifaEncontrada && !envioAdentro && (
              <div className="rounded-xl bg-[#eaf3fd] p-4 text-[#2d5175]" aria-live="polite">
                <p className="tabular-nums text-[18px] font-bold">
                  El envío a {tituloLocalidad(tarifaEncontrada.l)} cuesta {formatoPeso(tarifaEncontrada.m)}
                </p>
                {tarifaEncontrada.t && (
                  <p className="mt-1 text-[15px]">
                    Demora estimada:{' '}
                    {/mart|juev/i.test(tarifaEncontrada.t)
                      ? 'Sale martes y jueves desde Córdoba.'
                      : `${tarifaEncontrada.t} desde el despacho.`}
                  </p>
                )}
                <p className="mt-2 text-[13px] text-[#2d5175]">{leyendaEnvio}</p>
              </div>
            )}

            {noEncontrada && (
              <div className="rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" aria-live="polite">
                <p className="font-bold">
                  Todavía no llegamos a «{envioLocalidadTexto.trim()}» con envío a domicilio.
                </p>
                <p className="mt-1">
                  Podés retirarlo sin cargo en una farmacia, o consultarnos si hay otra forma de
                  hacértelo llegar.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                    onClick={onIrARetiro}
                  >
                    Retirar en farmacia
                  </button>
                  {whatsapp && (
                    <a
                      href={linkWhatsApp(
                        whatsapp,
                        `Hola! Quiero saber si hacen envíos a ${envioLocalidadTexto.trim()} — cotización #${cotizacion}`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                    >
                      Consultar por WhatsApp
                    </a>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="label-paso" htmlFor="calle">
                Calle y número
              </label>
              <input
                id="calle"
                className="input-paso"
                placeholder="Ej: Av. Colón 1234"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                onBlur={onBlurGuardar}
              />
            </div>
            <div>
              <label className="label-paso" htmlFor="piso">
                Piso y depto <span className="font-normal text-[#475569]">(opcional)</span>
              </label>
              <input
                id="piso"
                className="input-paso"
                placeholder="Ej: 3° B"
                value={piso}
                onChange={(e) => setPiso(e.target.value)}
                onBlur={onBlurGuardar}
              />
            </div>
            <div className="w-1/2">
              <label className="label-paso" htmlFor="cp">
                Código postal <span className="font-normal text-[#475569]">(opcional)</span>
              </label>
              <input
                id="cp"
                className="input-paso"
                inputMode="numeric"
                placeholder="Ej: 5000"
                value={cp}
                onChange={(e) => setCp(e.target.value)}
                onBlur={onBlurGuardar}
              />
            </div>
            <div>
              <label className="label-paso" htmlFor="referencias">
                Referencias para la entrega o comentarios <span className="font-normal text-[#475569]">(opcional)</span>
              </label>
              <textarea
                id="referencias"
                className="input-paso"
                rows={2}
                placeholder="Ej: portón negro, tocar timbre B"
                value={referencias}
                onChange={(e) => setReferencias(e.target.value)}
                onBlur={onBlurGuardar}
              />
            </div>
            <Celular celular={celular} setCelular={setCelular} onBlur={onBlurGuardar} />
          </div>
        </>
      )}

      <PasoFooter
        onSiguiente={onSiguiente}
        siguienteDeshabilitado={!puedeAvanzar}
        falta={falta}
        onVolver={onVolver}
        whatsapp={whatsapp}
        cotizacion={cotizacion}
        errorContacto={errorContacto}
        onReintentarContacto={onReintentarContacto}
      />
    </div>
  );
}

function Celular({
  celular,
  setCelular,
  onBlur,
}: {
  celular: string;
  setCelular: (v: string) => void;
  onBlur: () => void;
}) {
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
    </div>
  );
}
