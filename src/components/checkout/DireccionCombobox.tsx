'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { buscarTarifa, tituloLocalidad, type TarifaEnvio } from '@/lib/envios';
import { coincideAproximado, localidadesCoinciden } from '@/lib/direcciones';
import { IconCheck } from '../icons';

// ---------------------------------------------------------------
// Combobox de calle y número para envío a domicilio (v3.2, tema 2/3),
// validado con Google Places — REGLA DE ORO: si Google falla, tarda, no
// tiene key o no encuentra la dirección, el paciente SIEMPRE puede
// seguir y pagar. Nunca se frena un pago por Google. Este componente
// nunca deshabilita "Siguiente" ni bloquea nada por su cuenta — solo
// informa con una caja ámbar cuando no pudo verificar.
//
// Se degrada a input de texto común (sin más intentos ni cajas de
// aviso, "el paciente ni se entera") si /sugerir responde
// { disponible: false } o falla dos veces seguidas — típicamente sin
// GOOGLE_MAPS_API_KEY configurada.
// ---------------------------------------------------------------

type Sugerencia = { placeId: string; principal: string; secundario: string };
type DetalleGoogle = {
  calle: string;
  altura: string;
  localidadGoogle: string;
  provinciaGoogle: string;
  formateada: string;
};
type AvisoLocalidad =
  | { tipo: 'localidad-distinta'; localidadGoogle: string; tarifaCanonica: string | null }
  | { tipo: 'sin-altura' }
  | { tipo: 'sin-verificar' };

function nuevoSessionToken(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export default function DireccionCombobox({
  id = 'envio-calle',
  habilitado,
  localidad,
  provincia,
  tarifas,
  calle,
  setCalle,
  direccionVerificada,
  setDireccionVerificada,
  direccionConfirmadaTexto,
  setDireccionConfirmadaTexto,
  onUsarLocalidadGoogle,
  onBlurGuardar,
}: {
  id?: string;
  habilitado: boolean;
  localidad: string;
  provincia: string;
  tarifas: TarifaEnvio[];
  calle: string;
  setCalle: (v: string) => void;
  direccionVerificada: boolean;
  setDireccionVerificada: (v: boolean) => void;
  direccionConfirmadaTexto: string;
  setDireccionConfirmadaTexto: (v: string) => void;
  onUsarLocalidadGoogle: (localidadCanonica: string) => void;
  onBlurGuardar: () => void;
}) {
  const idBase = useId();
  const listboxId = `${idBase}-listbox`;

  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [indiceActivo, setIndiceActivo] = useState(-1);
  const [avisoLocalidad, setAvisoLocalidad] = useState<AvisoLocalidad | null>(null);
  // Ref, no state: se lee DENTRO de funciones async después de un
  // await, donde un useState recién actualizado por una llamada
  // anterior en la MISMA función seguiría viéndose viejo (closure
  // obsoleto hasta el próximo render) — un ref es síncrono, no importa
  // cuántos await pasen en el medio.
  const degradadoRef = useRef(false);

  const sessionTokenRef = useRef(nuevoSessionToken());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallosRef = useRef(0);
  // Guarda el detalle de Google cuando la localidad no coincide, para
  // que "Usar {localidadGoogle}" no tenga que pedirlo de nuevo.
  const pendienteRef = useRef<DetalleGoogle | null>(null);

  // Si el domicilio se vació desde afuera (cambio de localidad, C2), se
  // limpia también todo el estado visual del combobox.
  useEffect(() => {
    if (calle === '') {
      setAvisoLocalidad(null);
      setSugerencias([]);
      setAbierto(false);
      setIndiceActivo(-1);
      pendienteRef.current = null;
    }
  }, [calle]);

  function registrarFallo() {
    fallosRef.current += 1;
    if (fallosRef.current >= 2) degradadoRef.current = true;
  }

  async function buscarSugerencias(texto: string): Promise<Sugerencia[]> {
    if (texto.trim().length < 4) {
      setSugerencias([]);
      setAbierto(false);
      return [];
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/direcciones/sugerir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, localidad, provincia, sessionToken: sessionTokenRef.current }),
        signal: controller.signal,
      });
      if (!res.ok) {
        registrarFallo();
        return [];
      }
      const data = await res.json().catch(() => null);
      if (data?.disponible === false) {
        degradadoRef.current = true;
        return [];
      }
      fallosRef.current = 0;
      const lista: Sugerencia[] = Array.isArray(data?.sugerencias) ? data.sugerencias : [];
      return lista;
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') return [];
      registrarFallo();
      return [];
    }
  }

  function manejarCambioCalle(v: string) {
    setCalle(v);
    if (direccionVerificada) setDireccionVerificada(false);
    setDireccionConfirmadaTexto('');
    setAvisoLocalidad(null);
    pendienteRef.current = null;

    if (degradadoRef.current || !habilitado) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const lista = await buscarSugerencias(v);
      setSugerencias(lista);
      setAbierto(lista.length > 0);
      setIndiceActivo(-1);
    }, 350);
  }

  function procesarDetalle(data: DetalleGoogle) {
    if (!data.altura) {
      setDireccionVerificada(false);
      setDireccionConfirmadaTexto('');
      setAvisoLocalidad({ tipo: 'sin-altura' });
      return;
    }

    const texto = `${data.calle} ${data.altura}`.trim();
    setCalle(texto);

    if (!localidadesCoinciden(data.localidadGoogle, localidad)) {
      const tarifaGoogle = buscarTarifa(data.localidadGoogle, tarifas);
      pendienteRef.current = data;
      setAvisoLocalidad({ tipo: 'localidad-distinta', localidadGoogle: data.localidadGoogle, tarifaCanonica: tarifaGoogle?.l ?? null });
      setDireccionVerificada(false);
      setDireccionConfirmadaTexto('');
      return;
    }

    pendienteRef.current = null;
    setAvisoLocalidad(null);
    setDireccionVerificada(true);
    setDireccionConfirmadaTexto(data.formateada || texto);
  }

  async function pedirDetalle(placeId: string): Promise<DetalleGoogle | null> {
    try {
      const res = await fetch('/api/direcciones/detalle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId, sessionToken: sessionTokenRef.current }),
      });
      // El sessionToken se renueva DESPUÉS del detalle: así Google cobra
      // la sesión (autocomplete + detalle) como un solo evento.
      sessionTokenRef.current = nuevoSessionToken();
      if (!res.ok) {
        registrarFallo();
        return null;
      }
      const data = await res.json().catch(() => null);
      if (data?.disponible === false) {
        degradadoRef.current = true;
        return null;
      }
      fallosRef.current = 0;
      return data as DetalleGoogle;
    } catch {
      registrarFallo();
      return null;
    }
  }

  async function elegirSugerencia(s: Sugerencia) {
    setAbierto(false);
    setSugerencias([]);
    setIndiceActivo(-1);
    const data = await pedirDetalle(s.placeId);
    if (data) procesarDetalle(data);
  }

  async function alSalirDelCampo() {
    onBlurGuardar();
    // deja que un click en una sugerencia (onMouseDown con
    // preventDefault) gane la carrera antes de decidir si esto es una
    // "salida real" del campo.
    await new Promise((r) => setTimeout(r, 0));
    if (degradadoRef.current || !habilitado || direccionVerificada) return;
    const texto = calle.trim();
    if (texto.length < 4) return;

    const lista = await buscarSugerencias(texto);
    setAbierto(false);
    const primera = lista[0];
    if (primera && coincideAproximado(texto, primera.principal)) {
      await elegirSugerencia(primera);
    } else if (!degradadoRef.current) {
      setDireccionVerificada(false);
      setDireccionConfirmadaTexto('');
      setAvisoLocalidad({ tipo: 'sin-verificar' });
    }
  }

  function manejarTeclado(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!abierto || sugerencias.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceActivo((i) => (i + 1) % sugerencias.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceActivo((i) => (i <= 0 ? sugerencias.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (indiceActivo >= 0) {
        e.preventDefault();
        elegirSugerencia(sugerencias[indiceActivo]);
      }
    } else if (e.key === 'Escape') {
      setAbierto(false);
      setIndiceActivo(-1);
    }
  }

  function usarLocalidadGoogle() {
    if (avisoLocalidad?.tipo !== 'localidad-distinta' || !avisoLocalidad.tarifaCanonica || !pendienteRef.current) return;
    onUsarLocalidadGoogle(avisoLocalidad.tarifaCanonica);
    setDireccionVerificada(true);
    setDireccionConfirmadaTexto(pendienteRef.current.formateada || calle);
    setAvisoLocalidad(null);
    pendienteRef.current = null;
  }

  function corregirDireccion() {
    setCalle('');
    setDireccionVerificada(false);
    setDireccionConfirmadaTexto('');
    setAvisoLocalidad(null);
    pendienteRef.current = null;
    document.getElementById(id)?.focus();
  }

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={abierto}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={indiceActivo >= 0 ? `${idBase}-opt-${indiceActivo}` : undefined}
          autoComplete="off"
          disabled={!habilitado}
          className={`input-paso ${!habilitado ? 'cursor-not-allowed bg-slate-50 text-slate-400' : ''}`}
          placeholder="Ej: Av. Colón 1234"
          value={calle}
          onChange={(e) => manejarCambioCalle(e.target.value)}
          onBlur={alSalirDelCampo}
          onKeyDown={manejarTeclado}
        />
        {direccionVerificada && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-green-600">
            <IconCheck className="h-5 w-5" circulo={false} />
          </span>
        )}

        {abierto && sugerencias.length > 0 && (
          <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <ul id={listboxId} role="listbox" aria-label="Sugerencias de dirección">
              {sugerencias.map((s, i) => (
                <li
                  key={s.placeId}
                  id={`${idBase}-opt-${i}`}
                  role="option"
                  aria-selected={i === indiceActivo}
                  className={`flex min-h-[44px] cursor-pointer flex-col justify-center px-4 py-2 ${
                    i === indiceActivo ? 'bg-[#f2f8ff]' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    elegirSugerencia(s);
                  }}
                  onMouseEnter={() => setIndiceActivo(i)}
                >
                  <span className="text-[18px] font-semibold text-tinta">{s.principal}</span>
                  {s.secundario && <span className="text-[15px] text-[#475569]">{s.secundario}</span>}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1.5 border-t border-slate-100 px-4 py-2">
              <GoogleLogo className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] text-slate-400">Powered by Google</span>
            </div>
          </div>
        )}
      </div>

      {!habilitado && <p className="mt-1.5 text-[13px] text-[#475569]">Elegí primero tu localidad</p>}

      {direccionVerificada && direccionConfirmadaTexto && !avisoLocalidad && (
        <p className="mt-2 flex items-start gap-1.5 text-[14px] font-medium text-green-700">
          <IconCheck className="mt-0.5 h-4 w-4 shrink-0" circulo={false} />
          <span>{direccionConfirmadaTexto}</span>
        </p>
      )}

      {avisoLocalidad?.tipo === 'localidad-distinta' && (
        <div className="mt-2 rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" aria-live="polite">
          <p>
            Esa dirección parece estar en <b>{avisoLocalidad.localidadGoogle}</b>, no en {tituloLocalidad(localidad)}.
          </p>
          {!avisoLocalidad.tarifaCanonica && (
            <p className="mt-1">A {avisoLocalidad.localidadGoogle} todavía no llegamos con envío.</p>
          )}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {avisoLocalidad.tarifaCanonica && (
              <button
                className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
                onClick={usarLocalidadGoogle}
              >
                Usar {avisoLocalidad.localidadGoogle}
              </button>
            )}
            <button
              className="min-h-[44px] flex-1 rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-[14px] font-bold text-amber-900 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8ee7]"
              onClick={corregirDireccion}
            >
              Corregir la dirección
            </button>
          </div>
        </div>
      )}

      {avisoLocalidad?.tipo === 'sin-altura' && (
        <p className="mt-2 rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" aria-live="polite">
          Nos falta la altura de la calle.
        </p>
      )}

      {avisoLocalidad?.tipo === 'sin-verificar' && (
        <p className="mt-2 rounded-xl bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900" aria-live="polite">
          No pudimos verificar esa dirección. Revisá que esté bien escrita; igual podés seguir.
        </p>
      )}
    </div>
  );
}

function GoogleLogo({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z" />
      <path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </svg>
  );
}
