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
import { FARMACIA_BADRA } from '@/lib/farmaciaBadra';
import { PasoFooter, PasoHeader, Radio, RadioChico } from './ui';
import { IconCalendar, IconCheck, IconClock, IconMail, IconPhone, IconPin } from '../icons';
import DireccionCombobox from './DireccionCombobox';

// C2 (14-nov): la modalidad elegida despliega sus propios campos EN ESTA
// MISMA PANTALLA, debajo de la opción tocada — acordeón de una sola rama
// abierta a la vez (ya lo es por construcción: `recibe`/`retiroModo` solo
// pueden valer una cosa). Antes esos campos vivían en un Paso 2 aparte
// (Paso2Datos.tsx, eliminado); lo único que le quedaba a ese paso —
// celular y comentarios — se fusionó con "¿Cómo querés pagar?" (ver
// Paso3Pago.tsx). Visualmente, la opción elegida y su panel de campos se
// funden en una sola forma (mismo borde/fondo celeste, sin radio entre
// los dos) para que no lean como dos piezas sueltas.
export default function Paso1Recibir({
  cotizacion,
  hayEnvios,
  recibe,
  retiroModo,
  whatsapp,
  errorContacto,
  onReintentarContacto,
  onElegirRecibe,
  onElegirRetiroModo,
  tarifas,
  leyendaEnvio,
  envioAdentro,
  localidades,
  farmaciaRed,
  setFarmaciaRed,
  colegioLocalidad,
  setColegioLocalidad,
  fechaColegioTexto,
  envioLocalidadTexto,
  setEnvioLocalidadTexto,
  avisoLocalidadCambiada,
  calle,
  setCalle,
  direccionVerificada,
  setDireccionVerificada,
  direccionConfirmadaTexto,
  setDireccionConfirmadaTexto,
  onUsarLocalidadGoogle,
  avisoPrecioActualizado,
  onBlurGuardar,
  onSiguiente,
  onVolver,
}: {
  cotizacion: number;
  hayEnvios: boolean;
  recibe: 'retiro' | 'envio' | null;
  retiroModo: 'red' | 'colegio' | 'badra' | '';
  whatsapp: string | null;
  errorContacto?: boolean;
  onReintentarContacto?: () => void;
  onElegirRecibe: (r: 'retiro' | 'envio') => void;
  onElegirRetiroModo: (m: 'red' | 'colegio' | 'badra') => void;
  tarifas: TarifaEnvio[];
  leyendaEnvio: string;
  envioAdentro?: boolean;
  localidades: readonly string[];
  farmaciaRed: string;
  setFarmaciaRed: (v: string) => void;
  colegioLocalidad: string;
  setColegioLocalidad: (v: string) => void;
  fechaColegioTexto: string | null;
  envioLocalidadTexto: string;
  setEnvioLocalidadTexto: (v: string) => void;
  avisoLocalidadCambiada: boolean;
  calle: string;
  setCalle: (v: string) => void;
  direccionVerificada: boolean;
  setDireccionVerificada: (v: boolean) => void;
  direccionConfirmadaTexto: string;
  setDireccionConfirmadaTexto: (v: string) => void;
  onUsarLocalidadGoogle: (localidadCanonica: string) => void;
  avisoPrecioActualizado?: string | null;
  onBlurGuardar: () => void;
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
  const colegioLocalidadOficial = useMemo(
    () => (colegioSinListaDeLocalidades ? null : matchExactoLocalidad(colegioLocalidad, localidades)),
    [colegioSinListaDeLocalidades, colegioLocalidad, localidades]
  );
  const sugerenciasColegio = useMemo(
    () => (colegioSinListaDeLocalidades ? [] : sugerirLocalidades(colegioLocalidad, localidades, 6)),
    [colegioSinListaDeLocalidades, colegioLocalidad, localidades]
  );
  const colegioLocalidadBloqueada =
    !colegioSinListaDeLocalidades && colegioLocalidad.trim().length >= 3 && !colegioLocalidadOficial;
  // La caja de fecha SOLO se muestra con una localidad confirmada (match
  // oficial) — nunca a mitad de tecleo, ni vacía.
  const colegioLocalidadConfirmada = colegioSinListaDeLocalidades
    ? colegioLocalidad.trim().length >= 2
    : !!colegioLocalidadOficial;

  let puedeAvanzar = false;
  let falta = '';
  if (recibe === 'retiro' && retiroModo === 'red') {
    puedeAvanzar = !!farmaciaRed;
    falta = 'Elegí en qué Farmacia RED lo retirás';
  } else if (recibe === 'retiro' && retiroModo === 'badra') {
    puedeAvanzar = true;
  } else if (recibe === 'retiro' && retiroModo === 'colegio') {
    puedeAvanzar = colegioLocalidadConfirmada;
    falta = 'Elegí una localidad de la lista';
  } else if (recibe === 'envio') {
    puedeAvanzar = !!tarifaEncontrada && calle.trim().length >= 4 && !noEncontrada;
    falta = !envioLocalidadTexto.trim()
      ? 'Falta la localidad de envío'
      : !tarifaEncontrada
        ? 'Elegí una localidad de la lista de sugerencias'
        : 'Falta la calle y el número';
  } else if (recibe === 'retiro') {
    falta = 'Elegí Córdoba capital o interior de la provincia';
  } else {
    falta = 'Elegí cómo querés recibirlo';
  }

  return (
    <>
      <PasoHeader paso={1} />
      <h2 className="mt-5 font-sans text-[26px] font-bold text-tinta">¿Cómo querés recibirlo?</h2>

      <div className="mt-5 space-y-3" role="radiogroup" aria-label="¿Cómo querés recibirlo?">
        <button
          id="btn-retiro"
          className={`opcion ${
            recibe === 'retiro' ? 'rounded-b-none border-b-0 border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
          onClick={() => onElegirRecibe('retiro')}
          role="radio"
          aria-checked={recibe === 'retiro'}
          aria-expanded={recibe === 'retiro'}
          aria-controls="panel-retiro"
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'retiro'} />
            <span>
              <span className="block text-[19px] font-bold text-tinta">Lo retiro en una farmacia</span>
              <span className="block text-[15px] text-[#475569]">Sin cargo. Córdoba capital e interior.</span>
            </span>
          </span>
        </button>

        {recibe === 'retiro' && (
          <div
            id="panel-retiro"
            role="region"
            aria-labelledby="btn-retiro"
            className="-mt-3 space-y-2 rounded-b-xl border-2 border-t-0 border-[#3d8ee7] bg-[#f2f8ff] p-3 fade-paso"
          >
            <button
              id="btn-red"
              className={`opcion-chica ${
                retiroModo === 'red' ? 'rounded-b-none border-b-0 border-[#3d8ee7] bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              onClick={() => onElegirRetiroModo('red')}
              role="radio"
              aria-checked={retiroModo === 'red'}
              aria-expanded={retiroModo === 'red'}
              aria-controls="panel-red"
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <RadioChico activo={retiroModo === 'red'} />
                  <span>
                    <span className="block text-[15px] font-bold text-tinta">Córdoba capital · Farmacias RED</span>
                    <span className="block text-[13px] text-[#475569]">En una Farmacia RED, la que elijas.</span>
                  </span>
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/farmacias-red.png" alt="Farmacias RED" width={498} height={302} className="h-14 w-auto shrink-0" />
              </span>
            </button>
            {retiroModo === 'red' && (
              <div
                id="panel-red"
                role="region"
                aria-labelledby="btn-red"
                className="space-y-3 rounded-b-xl border-2 border-t-0 border-[#3d8ee7] bg-white p-3.5 fade-paso"
              >
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
              </div>
            )}

            <button
              id="btn-badra"
              className={`opcion-chica ${
                retiroModo === 'badra' ? 'rounded-b-none border-b-0 border-[#3d8ee7] bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              onClick={() => onElegirRetiroModo('badra')}
              role="radio"
              aria-checked={retiroModo === 'badra'}
              aria-expanded={retiroModo === 'badra'}
              aria-controls="panel-badra"
            >
              <span className="flex items-center gap-2.5">
                <RadioChico activo={retiroModo === 'badra'} />
                <span>
                  <span className="block text-[15px] font-bold text-tinta">Córdoba capital · Nueva Farmacia Badra</span>
                  <span className="block text-[13px] text-[#475569]">Félix Paz 585.</span>
                </span>
              </span>
            </button>
            {retiroModo === 'badra' && (
              <div
                id="panel-badra"
                role="region"
                aria-labelledby="btn-badra"
                className="space-y-3 rounded-b-xl border-2 border-t-0 border-[#3d8ee7] bg-white p-3.5 fade-paso"
              >
                <div className="rounded-[14px] bg-slate-50 p-4">
                  <p className="text-[16px] font-bold text-tinta">{FARMACIA_BADRA.nombre}</p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <IconPin className="mt-0.5 h-5 w-5 shrink-0 text-[#2f6fbd]" />
                      <div>
                        <p className="text-[16px] text-tinta">{FARMACIA_BADRA.direccion}</p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(FARMACIA_BADRA.mapsQuery)}`}
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
                      <p className="text-[16px] text-tinta">{FARMACIA_BADRA.horario}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-[15px] font-bold text-emerald-700">Retiro sin cargo</p>
                </div>
                <p className="text-[15px] leading-relaxed text-[#475569]">
                  Cuando esté listo te avisamos por WhatsApp y lo dejamos en esa farmacia a tu nombre.
                </p>
              </div>
            )}

            <button
              id="btn-colegio"
              className={`opcion-chica ${
                retiroModo === 'colegio' ? 'rounded-b-none border-b-0 border-[#3d8ee7] bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              onClick={() => onElegirRetiroModo('colegio')}
              role="radio"
              aria-checked={retiroModo === 'colegio'}
              aria-expanded={retiroModo === 'colegio'}
              aria-controls="panel-colegio"
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
            {retiroModo === 'colegio' && (
              <div
                id="panel-colegio"
                role="region"
                aria-labelledby="btn-colegio"
                className="space-y-3 rounded-b-xl border-2 border-t-0 border-[#3d8ee7] bg-white p-3.5 fade-paso"
              >
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
                  A través de un convenio con el Colegio de Farmacéuticos de la Provincia de Córdoba
                  te informaremos en cuál farmacia de tu localidad podrás retirar cuando ya esté
                  elaborado tu pedido.
                </div>

                {colegioLocalidadBloqueada ? (
                  <div className="rounded-xl bg-amber-50 p-4 text-[18px] leading-relaxed text-amber-900" aria-live="polite">
                    <p className="font-bold">Por el Colegio solo llegamos a localidades de Córdoba.</p>
                    <p className="mt-1">
                      Si «{colegioLocalidad.trim()}» está en Córdoba, fijate cómo figura en la
                      lista; si no, podés pedir envío a domicilio o retirarlo en una Farmacia RED de
                      Córdoba capital.
                    </p>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <button
                        className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                        onClick={() => onElegirRecibe('envio')}
                      >
                        Envío a domicilio
                      </button>
                      <button
                        className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                        onClick={() => onElegirRetiroModo('red')}
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
                              ? `Llega a la farmacia de tu localidad el ${fechaColegioTexto}; podrás retirar tu pedido una vez elaborado.`
                              : 'Te confirmamos la fecha de llegada por WhatsApp.'}
                          </p>
                          <p className="mt-1 text-[15px] text-[#475569]">
                            Lo lleva el Colegio de Farmacéuticos con su reparto quincenal. Unos días
                            antes te avisamos por WhatsApp en qué farmacia retirarlo.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {hayEnvios ? (
          <button
            id="btn-envio"
            className={`opcion ${
              recibe === 'envio' ? 'rounded-b-none border-b-0 border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            onClick={() => onElegirRecibe('envio')}
            role="radio"
            aria-checked={recibe === 'envio'}
            aria-expanded={recibe === 'envio'}
            aria-controls="panel-envio"
          >
            <span className="flex items-start gap-3">
              <Radio activo={recibe === 'envio'} />
              <span>
                <span className="block text-[19px] font-bold text-tinta">Envío a domicilio</span>
                <span className="block text-[15px] text-[#475569]">
                  Por un tercero por cuenta y orden del paciente.
                </span>
              </span>
            </span>
          </button>
        ) : (
          <div
            className="opcion cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
            role="radio"
            aria-checked={false}
            aria-disabled="true"
          >
            <span className="flex items-start gap-3">
              <Radio activo={false} />
              <span>
                <span className="block text-[19px] font-bold text-slate-400">Envío a domicilio</span>
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

        {recibe === 'envio' && (
          <div
            id="panel-envio"
            role="region"
            aria-labelledby="btn-envio"
            className="-mt-3 space-y-3 rounded-b-xl border-2 border-t-0 border-[#3d8ee7] bg-[#f2f8ff] p-3.5 fade-paso"
          >
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
              {avisoLocalidadCambiada && (
                <p className="mt-1.5 text-[13px] text-[#475569]" aria-live="polite">
                  Se borró la dirección al cambiar de localidad.
                </p>
              )}
            </div>

            {tarifaEncontrada && envioAdentro && (
              <div
                className={`rounded-xl bg-white p-4 text-[#2d5175] transition-shadow duration-500 ${
                  avisoPrecioActualizado ? 'ring-2 ring-[#3d8ee7]' : ''
                }`}
                aria-live="polite"
              >
                <p className="tabular-nums text-[18px] font-bold">Envío incluido en el precio</p>
              </div>
            )}

            {tarifaEncontrada && !envioAdentro && (
              <div
                className={`rounded-xl bg-white p-4 text-[#2d5175] transition-shadow duration-500 ${
                  avisoPrecioActualizado ? 'ring-2 ring-[#3d8ee7]' : ''
                }`}
                aria-live="polite"
              >
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
            {avisoPrecioActualizado && (
              <p className="sr-only" aria-live="polite">
                Envío actualizado a {avisoPrecioActualizado}
              </p>
            )}

            {noEncontrada && (
              <div className="rounded-xl bg-amber-50 p-4 text-[18px] leading-relaxed text-amber-900" aria-live="polite">
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
                    onClick={() => onElegirRecibe('retiro')}
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
              <DireccionCombobox
                id="calle"
                habilitado={!!tarifaEncontrada}
                localidad={tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : envioLocalidadTexto.trim()}
                provincia={tarifaEncontrada?.p ?? ''}
                tarifas={tarifas}
                envioAdentro={envioAdentro}
                calle={calle}
                setCalle={setCalle}
                direccionVerificada={direccionVerificada}
                setDireccionVerificada={setDireccionVerificada}
                direccionConfirmadaTexto={direccionConfirmadaTexto}
                setDireccionConfirmadaTexto={setDireccionConfirmadaTexto}
                onUsarLocalidadGoogle={onUsarLocalidadGoogle}
                onBlurGuardar={onBlurGuardar}
              />
              <p className="mt-1.5 text-[13px] text-[#475569]">
                El piso, depto, timbre o alguna referencia para la entrega van en "Comentarios", en
                el próximo paso.
              </p>
            </div>
          </div>
        )}
      </div>

      <PasoFooter
        onSiguiente={onSiguiente}
        siguienteDeshabilitado={!puedeAvanzar}
        falta={falta}
        onVolver={onVolver}
        volverLabel="Volver al inicio"
        whatsapp={whatsapp}
        cotizacion={cotizacion}
        errorContacto={errorContacto}
        onReintentarContacto={onReintentarContacto}
      />
    </>
  );
}
