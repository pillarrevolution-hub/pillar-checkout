import { useMemo } from 'react';
import { linkWhatsApp } from '@/lib/datos';
import { formatoPeso } from '@/lib/firma';
import {
  buscarTarifa,
  matchExactoLocalidad,
  matchUnicoDifuso,
  sugerirLocalidades,
  sugerirTarifas,
  tituloLocalidad,
  type TarifaEnvio,
} from '@/lib/envios';
import { FARMACIAS_RED } from '@/lib/farmaciasRed';
import { PasoFooter, PasoHeader } from './ui';
import { IconCalendar, IconCheck, IconClock, IconMail, IconPhone, IconPin } from '../icons';

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
  fechaColegioTexto,
  onCambiarAEnvio,
  onCambiarARed,
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
  fechaColegioTexto: string | null;
  onCambiarAEnvio: () => void;
  onCambiarARed: () => void;
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
  const tarifaEncontrada = useMemo(
    () => (recibe === 'envio' ? buscarTarifa(envioLocalidadTexto, tarifas) : null),
    [recibe, envioLocalidadTexto, tarifas]
  );
  const sugerencias = useMemo(
    () => (recibe === 'envio' ? sugerirTarifas(envioLocalidadTexto, tarifas, 6) : []),
    [recibe, envioLocalidadTexto, tarifas]
  );
  const noEncontrada = recibe === 'envio' && envioLocalidadTexto.trim().length >= 3 && !tarifaEncontrada;

  // Localidad del Colegio restringida a Córdoba (pedido de Tomi): si
  // `localidades` viene vacío (link viejo o Malvinas caído) no bloqueamos
  // a nadie por un dato que no cargó — texto libre como antes.
  const colegioSinListaDeLocalidades = localidades.length === 0;
  if (colegioSinListaDeLocalidades && retiroModo === 'colegio') {
    console.warn('Paso2Datos: localidades vacío — Colegio queda con localidad libre, sin restricción');
  }
  const colegioLocalidadOficial = useMemo(
    () => (colegioSinListaDeLocalidades ? null : matchExactoLocalidad(colegioLocalidad, localidades)),
    [colegioSinListaDeLocalidades, colegioLocalidad, localidades]
  );
  const sugerenciasColegio = useMemo(
    () => (colegioSinListaDeLocalidades ? [] : sugerirLocalidades(colegioLocalidad, localidades, 6)),
    [colegioSinListaDeLocalidades, colegioLocalidad, localidades]
  );
  // Bloqueada: hay texto (≥3 caracteres) y ninguna localidad oficial lo
  // confirma — el onChange de abajo ya auto-acepta el único caso
  // ambiguo resoluble (una sola sugerencia difusa), así que acá solo
  // queda el caso real de "no hay o hay demasiadas".
  const colegioLocalidadBloqueada =
    !colegioSinListaDeLocalidades && colegioLocalidad.trim().length >= 3 && !colegioLocalidadOficial;
  // La caja de fecha SOLO se muestra con una localidad confirmada (match
  // oficial) — nunca a mitad de tecleo, ni vacía (v3.1.1: antes se
  // mostraba por default apenas se entraba a este paso).
  const colegioLocalidadConfirmada = colegioSinListaDeLocalidades
    ? colegioLocalidad.trim().length >= 2
    : !!colegioLocalidadOficial;

  let puedeAvanzar = false;
  let falta = '';
  if (recibe === 'retiro' && retiroModo === 'red') {
    puedeAvanzar = !!farmaciaRed && celularOk(celular);
    falta = !farmaciaRed ? 'Elegí en qué Farmacia RED lo retirás' : 'Falta tu celular';
  } else if (recibe === 'retiro' && retiroModo === 'colegio') {
    puedeAvanzar = colegioLocalidadConfirmada && celularOk(celular);
    falta = !colegioLocalidadConfirmada ? 'Elegí una localidad de la lista' : 'Falta tu celular';
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
                            aria-label="Ver en el mapa (se abre en otra pestaña)"
                            className="link-tap text-[15px] font-medium text-[#2f6fbd] underline"
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
                          className="link-tap text-[16px] font-medium text-[#2f6fbd] underline"
                        >
                          {suc.telefono}
                        </a>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <IconMail className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                        <a
                          href={`mailto:${suc.mail}`}
                          className="link-tap break-all text-[16px] font-medium text-[#2f6fbd] underline"
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
              <div className="relative">
                <input
                  id="colegio-localidad"
                  className="input-paso"
                  list="localidades-colegio"
                  autoComplete="off"
                  placeholder="Ej: Alta Gracia"
                  value={colegioLocalidad}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (colegioSinListaDeLocalidades) {
                      setColegioLocalidad(raw);
                      return;
                    }
                    const oficial = matchExactoLocalidad(raw, localidades) ?? matchUnicoDifuso(raw, localidades);
                    setColegioLocalidad(oficial ?? raw);
                  }}
                  onBlur={onBlurGuardar}
                />
                {colegioLocalidadOficial && (
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
                    <IconCheck className="h-5 w-5" circulo={false} />
                  </span>
                )}
              </div>
              <datalist id="localidades-colegio">
                {(colegioSinListaDeLocalidades ? localidades : sugerenciasColegio).map((l) => (
                  <option key={l} value={l} />
                ))}
              </datalist>
            </div>

            <div className="rounded-xl bg-[#eaf3fd] p-4 text-[15px] leading-relaxed text-[#2d5175]">
              A través de un convenio con el Colegio de Farmacéuticos de la Provincia de Córdoba te
              informaremos en cuál farmacia de tu localidad podrás retirar cuando ya esté elaborado
              tu pedido.
            </div>

            {colegioLocalidadBloqueada ? (
              <div className="rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" aria-live="polite">
                <p className="font-bold">Por el Colegio solo llegamos a localidades de Córdoba.</p>
                <p className="mt-1">
                  Si «{colegioLocalidad.trim()}» está en Córdoba, fijate cómo figura en la lista; si
                  no, podés pedir envío a domicilio o retirarlo en una Farmacia RED de Córdoba
                  capital.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                    onClick={onCambiarAEnvio}
                  >
                    Envío a domicilio
                  </button>
                  <button
                    className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                    onClick={onCambiarARed}
                  >
                    Retirar en Farmacia RED
                  </button>
                </div>
              </div>
            ) : (
              colegioLocalidadConfirmada && (
                <div className="rounded-[14px] bg-slate-50 p-4" aria-live="polite">
                  <div className="flex items-start gap-2.5">
                    <IconCalendar className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                    <div>
                      <p className="text-[18px] font-bold text-tinta">
                        {fechaColegioTexto
                          ? `Tu pedido llega a una farmacia de tu localidad el ${fechaColegioTexto}.`
                          : 'Te confirmamos por WhatsApp el día que llega a tu localidad.'}
                      </p>
                      <p className="mt-1 text-[15px] text-[#475569]">
                        Lo lleva el Colegio de Farmacéuticos con su reparto quincenal. Ese día te
                        avisamos por WhatsApp en qué farmacia retirarlo.
                      </p>
                    </div>
                  </div>
                </div>
              )
            )}

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
                    className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
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
                      className="flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-center text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
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
