'use client';
import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  formatoPeso,
  listaDerivada,
  montoEnvio,
  total,
  type EleccionEnvio,
} from '@/lib/firma';
import type { DatosCheckout } from '@/lib/datos';
import { cuotaDeLista } from '@/lib/precios';
import { tarifaEnvio, tituloLocalidad } from '@/lib/envios';
import { claveDraft } from '@/lib/borrador';
import { descripcionRecibo, type ReciboElegido } from '@/lib/mensajes';
import { RETIRO_LUGAR_BADRA } from '@/lib/farmaciaBadra';
import { proximoRepartoColegio, fechaRepartoTexto } from '@/lib/colegioFechas';
import Home from './checkout/Home';
import Paso1Recibir from './checkout/Paso1Recibir';
import Paso3Pago, { type Pago } from './checkout/Paso3Pago';
import Paso4Pagar from './checkout/Paso4Pagar';

// ---------------------------------------------------------------
// Checkout PILL.AR v3 — UNA sola versión (decisión de Tomi): Home + paso
// a paso de 4 pantallas. Retiro en Farmacia RED / Colegio de
// Farmacéuticos, envío a domicilio a todo el país con tarifa plana por
// provincia (B1, 16-nov: $15.000 Córdoba / $17.000 resto, ver
// `tarifaEnvio()` en @/lib/envios), sin fecha de entrega. `history.pushState`
// por paso para que el botón "atrás" del celular funcione. Todo el estado
// del paso a paso vive en UN reducer (v3.1) que se guarda en
// sessionStorage en cada cambio — un refresh accidental no pierde nada
// (nunca en localStorage: el celular no debe sobrevivir más que la
// pestaña).
// ---------------------------------------------------------------

// C2 (14-nov): bajó de 6 a 4 pantallas — el viejo Paso 2 ("Datos", los
// campos propios de cada modalidad) se fusionó con el Paso 1 (acordeón)
// y con "¿Cómo querés pagar?" (celular + comentarios). Flujo numerado
// (PasoHeader, "de 3"): 1 Recibir → 2 Pago → 3 Pagar; 0 Home queda sin
// número visible, como antes. C4 (16-nov): la confirmación de
// transferencia dejó de ser una 5ª pantalla del wizard — "Ya envié el
// comprobante" ahora navega afuera, a /gracias (mismo destino que vuelve
// de Mercado Pago), así que el `Paso` más alto es 3.
type Paso = 0 | 1 | 2 | 3;
type Recibe = 'retiro' | 'envio' | null;
type RetiroModo = 'red' | 'colegio' | 'badra' | '';

type Estado = {
  paso: Paso;
  recibe: Recibe;
  retiroModo: RetiroModo;
  farmaciaRed: string;
  colegioLocalidad: string;
  envioLocalidadTexto: string;
  // B1 (16-nov): provincia del domicilio de envío — la resuelve Google
  // (DireccionCombobox) o el `<select>` de Plan B en Paso1Recibir. Único
  // dato del que depende el precio del envío (ver tarifaEnvio en
  // @/lib/envios); null hasta que se resuelve de una forma u otra.
  provincia: string | null;
  calle: string;
  // Verificación de dirección con Google Places (v3.2, tema 2/3):
  // direccionVerificada nunca bloquea nada, solo decide si
  // guardarContacto le suma "⚠ Dirección sin verificar" al final.
  // direccionConfirmadaTexto es la formattedAddress de Google, para la
  // línea "✓ {formateada}" — vive en el estado (no local al combobox)
  // para sobrevivir al desmontaje/montaje del paso al volver.
  direccionVerificada: boolean;
  direccionConfirmadaTexto: string;
  // B3 (16-nov): si Google reconoce la calle pero no trae `street_number`
  // (una esquina, una plaza), no se puede entregar ahí — el combobox pide
  // la altura en un campo chico al lado y esto bloquea "Siguiente" hasta
  // que se complete (ver Paso1Recibir.puedeAvanzar).
  faltaAltura: boolean;
  piso: string;
  // B3 (16-nov): código postal — lo trae Google con la dirección elegida
  // (DireccionCombobox lo escribe acá solo); si no lo trae, queda vacío y
  // el paciente lo puede escribir a mano en un campo editable, sin que
  // eso bloquee nada (aviso suave, igual que antes).
  cp: string;
  referencias: string;
  celular: string;
  pago: Pago;
};

const ESTADO_INICIAL: Estado = {
  paso: 0,
  recibe: null,
  retiroModo: '',
  farmaciaRed: '',
  colegioLocalidad: '',
  envioLocalidadTexto: '',
  provincia: null,
  calle: '',
  direccionVerificada: false,
  direccionConfirmadaTexto: '',
  faltaAltura: false,
  piso: '',
  cp: '',
  referencias: '',
  celular: '',
  pago: 'transferencia',
};

type CampoEditable = Exclude<keyof Estado, 'paso'>;

type Accion =
  | { type: 'campo'; campo: CampoEditable; valor: Estado[CampoEditable] }
  | { type: 'paso'; paso: Paso }
  | { type: 'restaurar'; estado: Estado }
  // Cambiar la localidad de envío A MANO limpia la dirección ya cargada
  // y su verificación (C2: "si el paciente cambia la localidad después,
  // se limpian la dirección y la verificación") — pero solo si había
  // algo que limpiar, si no es un cambio de campo normal. Distinto de
  // 'campo' sobre envioLocalidadTexto: ese se usa para "Usar
  // {localidadGoogle}", que cambia la localidad SIN tocar la dirección
  // (la dirección seguía siendo la correcta, solo estaba mal
  // etiquetada).
  | { type: 'cambiarLocalidadEnvio'; valor: string }
  // C2 (14-nov): elegir la modalidad (o la sub-modalidad de retiro) limpia
  // los datos de la que se deja — nunca quedan "fantasmas" en el estado
  // ni en el borrador (ej.: elegir envío con dirección cargada y después
  // volver a RED no debe dejar esa dirección dando vueltas).
  | { type: 'elegirRecibe'; valor: 'retiro' | 'envio' }
  | { type: 'elegirRetiroModo'; valor: 'red' | 'colegio' | 'badra' };

function reducerPaso(estado: Estado, accion: Accion): Estado {
  switch (accion.type) {
    case 'campo':
      return { ...estado, [accion.campo]: accion.valor };
    case 'paso':
      return { ...estado, paso: accion.paso };
    case 'restaurar':
      return accion.estado;
    case 'cambiarLocalidadEnvio': {
      const huboDireccion = estado.calle.trim() !== '' || estado.direccionVerificada;
      return {
        ...estado,
        envioLocalidadTexto: accion.valor,
        // Nueva localidad → la provincia vieja ya no vale nada (puede
        // ser otra, aunque Google no haya vuelto a correr todavía).
        provincia: null,
        ...(huboDireccion
          ? { calle: '', direccionVerificada: false, direccionConfirmadaTexto: '', faltaAltura: false, cp: '' }
          : {}),
      };
    }
    case 'elegirRecibe':
      return accion.valor === 'envio'
        ? { ...estado, recibe: 'envio', retiroModo: '', farmaciaRed: '', colegioLocalidad: '' }
        : {
            ...estado,
            recibe: 'retiro',
            envioLocalidadTexto: '',
            provincia: null,
            calle: '',
            direccionVerificada: false,
            direccionConfirmadaTexto: '',
            faltaAltura: false,
            cp: '',
          };
    case 'elegirRetiroModo':
      return {
        ...estado,
        retiroModo: accion.valor,
        farmaciaRed: accion.valor === 'red' ? estado.farmaciaRed : '',
        colegioLocalidad: accion.valor === 'colegio' ? estado.colegioLocalidad : '',
      };
    default:
      return estado;
  }
}

function cargarDraft(o: number): Estado | null {
  try {
    const raw = sessionStorage.getItem(claveDraft(o));
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d?.paso !== 'number') return null;
    return { ...ESTADO_INICIAL, ...d };
  } catch {
    return null;
  }
}

export default function Checkout({
  payload,
  fuente,
  whatsapp,
  comprobanteRecibido = false,
  hoy,
}: {
  payload: DatosCheckout;
  fuente: { c: string; t: string } | { p: string; t: string };
  whatsapp: string | null;
  comprobanteRecibido?: boolean;
  hoy: string;
}) {
  const [estado, dispatch] = useReducer(reducerPaso, ESTADO_INICIAL);
  const {
    paso,
    recibe,
    retiroModo,
    farmaciaRed,
    colegioLocalidad,
    envioLocalidadTexto,
    provincia,
    calle,
    direccionVerificada,
    direccionConfirmadaTexto,
    faltaAltura,
    piso,
    cp,
    referencias,
    celular,
    pago,
  } = estado;

  function campo<K extends CampoEditable>(nombre: K, valor: Estado[K]) {
    dispatch({ type: 'campo', campo: nombre, valor });
  }

  // Aviso chico (no modal, no persistente) de que cambiar la localidad
  // borró la dirección que ya estaba cargada — pedido explícito de C2.
  const [avisoLocalidadCambiada, setAvisoLocalidadCambiada] = useState(false);

  function cambiarLocalidadEnvio(valor: string) {
    const huboDireccion = calle.trim() !== '' || direccionVerificada;
    dispatch({ type: 'cambiarLocalidadEnvio', valor });
    // Solo se PRENDE acá (nunca se apaga): si se apagara cuando
    // huboDireccion da false, la siguiente tecla que el paciente tipee
    // en la localidad (con `calle` ya vacía por el primer borrado) lo
    // apagaría de nuevo antes de que llegue a leerlo. Se apaga recién
    // cuando vuelve a tocar el campo de calle (ver setCalle más abajo).
    if (huboDireccion) setAvisoLocalidadCambiada(true);
  }

  // "Usar {localidadGoogle}": la dirección seguía siendo la correcta,
  // solo estaba etiquetada con otra localidad — cambia la localidad
  // SIN pasar por 'cambiarLocalidadEnvio' (que limpiaría la dirección
  // que el combobox ya marcó como verificada). La provincia (y, con
  // ella, el precio) la actualiza el combobox aparte, vía `setProvincia`
  // — ver el aviso de precio actualizado más abajo.
  function usarLocalidadGoogle(localidadCanonica: string) {
    campo('envioLocalidadTexto', tituloLocalidad(localidadCanonica));
  }

  // Se apaga sola: el resaltado y el anuncio son un instante, no un
  // estado permanente de la pantalla.
  const [avisoPrecioActualizado, setAvisoPrecioActualizado] = useState<string | null>(null);
  useEffect(() => {
    if (!avisoPrecioActualizado) return;
    const t = setTimeout(() => setAvisoPrecioActualizado(null), 4000);
    return () => clearTimeout(t);
  }, [avisoPrecioActualizado]);

  // B1 (16-nov): el precio de envío depende solo de la provincia — si
  // cambia DESPUÉS de haberse mostrado una vez (ej.: "Usar {localidad}"
  // resuelve una provincia distinta a la tipeada), se resalta la caja de
  // precio y se anuncia, igual que hacía antes el cambio de localidad.
  // Si todavía no se mostró ningún precio (primera vez que se resuelve),
  // no hay "antes" contra qué comparar — no se avisa nada.
  const montoEnvioAnteriorRef = useRef<number | null>(null);
  useEffect(() => {
    if (recibe !== 'envio') return;
    const montoNuevo = payload.envioAdentro ? 0 : tarifaEnvio(provincia);
    const anterior = montoEnvioAnteriorRef.current;
    if (anterior !== null && montoNuevo !== null && montoNuevo !== anterior) {
      setAvisoPrecioActualizado(formatoPeso(montoNuevo));
    }
    montoEnvioAnteriorRef.current = montoNuevo;
  }, [recibe, provincia, payload.envioAdentro]);

  // Hasta que el borrador se restaure (o se confirme que no había
  // ninguno), no sabemos qué paso mostrar: mientras tanto se pinta un
  // placeholder neutro (nunca la Home) para que el HTML del server y el
  // primer render del cliente coincidan siempre, sea cual sea el paso
  // real al que se vaya a volver.
  const [listo, setListo] = useState(false);

  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [cargandoMP, setCargandoMP] = useState(false);
  const [errorMP, setErrorMP] = useState('');
  const [errorContacto, setErrorContacto] = useState(false);

  const ultimoContacto = useRef('');

  // Borrador en sessionStorage (try/catch: en navegación privada puede
  // tirar). Nunca en localStorage — el celular no tiene que sobrevivir
  // más que la pestaña. Se salta mientras `estado` siga siendo la MISMA
  // referencia de ESTADO_INICIAL: ese es el render de montaje, previo a
  // que el efecto de abajo restaure el borrador — persistirlo pisaría el
  // borrador real con "paso: 0". Comparar por referencia (no por un ref
  // aparte tipo "ya restauré") es lo que lo hace a prueba de que este
  // efecto dispare con el closure viejo (p. ej. por el doble-invoke de
  // efectos en modo estricto): el closure viejo siempre trae el `estado`
  // viejo pegado, así que la comparación nunca da falsos positivos.
  useEffect(() => {
    if (estado === ESTADO_INICIAL) return;
    try {
      sessionStorage.setItem(claveDraft(payload.o), JSON.stringify(estado));
    } catch {
      /* sessionStorage no disponible — sin borrador, no rompe nada */
    }
  }, [estado, payload.o]);

  // El reducer siempre arranca en ESTADO_INICIAL (paso 0) para que el
  // primer render del cliente coincida con el del server — sessionStorage
  // no existe en el server, así que leer el borrador durante el init del
  // reducer generaba un mismatch de hidratación cada vez que había un
  // borrador guardado. En cambio, se restaura acá con useLayoutEffect
  // (corre antes de pintar, así no se ve un flash de la Home) y de paso
  // se deja el history.pushState reflejando el paso restaurado.
  useLayoutEffect(() => {
    const draft = cargarDraft(payload.o);
    if (draft) dispatch({ type: 'restaurar', estado: draft });
    else if (payload.paciente?.celular) dispatch({ type: 'campo', campo: 'celular', valor: payload.paciente.celular });
    // Se preserva el resto de history.state (Next.js guarda ahí sus
    // propios internals de router, __NA entre otros) y solo se pisa la
    // clave `paso`: reemplazar el objeto entero deja a Next sin sus datos
    // y su handler de popstate, al no encontrarlos, fuerza una recarga
    // completa en vez de solo re-renderizar — eso era el "parpadeo".
    window.history.replaceState({ ...window.history.state, paso: draft?.paso ?? 0 }, '');
    setListo(true);
    function onPop(e: PopStateEvent) {
      const p = (e.state as { paso?: number } | null)?.paso;
      dispatch({ type: 'paso', paso: (typeof p === 'number' ? p : 0) as Paso });
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function irA(n: Paso) {
    dispatch({ type: 'paso', paso: n });
    window.history.pushState({ ...window.history.state, paso: n }, '');
  }
  const volver = () => window.history.back();

  const localidades = payload.localidades ?? [];
  // B1 (16-nov): sin tarifario — el monto sale solo de la provincia.
  const montoEnvioCalculado = recibe === 'envio' ? tarifaEnvio(provincia) : null;

  const eleccion: EleccionEnvio = useMemo(() => {
    if (recibe === 'envio' && montoEnvioCalculado !== null) {
      return { modo: 'envio', monto: payload.envioAdentro ? 0 : montoEnvioCalculado };
    }
    return { modo: 'retiro' };
  }, [recibe, montoEnvioCalculado, payload.envioAdentro]);

  const li = listaDerivada(payload);
  if (Math.abs(payload.li - li) > 1) {
    // El "15%" tiene que ser siempre cierto (pedido de Tomi): se ignora el
    // li que manda Malvinas, esto es solo diagnóstico.
    console.warn(`Checkout: li de Malvinas (${payload.li}) difiere de la lista derivada (${li})`);
  }
  const t = useMemo(() => {
    const cuotas = total(payload, eleccion, 'cuotas');
    return {
      contado: total(payload, eleccion, 'contado'),
      cuotas,
      cuota: cuotaDeLista(cuotas),
      envio: montoEnvio(eleccion),
    };
  }, [payload, eleccion, li]);

  const direccionEnvioCompleta = useMemo(() => {
    if (recibe !== 'envio') return '';
    const localidadDisplay = tituloLocalidad(envioLocalidadTexto.trim());
    const base = [
      calle.trim(),
      piso.trim(),
      localidadDisplay && cp.trim() ? `${localidadDisplay} (CP ${cp.trim()})` : localidadDisplay || (cp.trim() ? `CP ${cp.trim()}` : ''),
    ]
      .filter(Boolean)
      .join(', ')
      .concat(referencias.trim() ? ` — ${referencias.trim()}` : '');
    // Igual que "Llega por Colegio: {fecha}" (C5): un texto que Atención
    // vea en 📒 Seguimiento para que chequee a mano una dirección que
    // Google no pudo confirmar. Verificada, no se le agrega nada.
    if (base && !direccionVerificada) return `${base} ⚠ Dirección sin verificar`;
    return base;
  }, [recibe, calle, piso, cp, referencias, envioLocalidadTexto, direccionVerificada]);

  const direccionCorta = useMemo(() => {
    const localidadDisplay = tituloLocalidad(envioLocalidadTexto.trim());
    return [calle.trim(), piso.trim()].filter(Boolean).join(' ').concat(localidadDisplay ? `, ${localidadDisplay}` : '');
  }, [calle, piso, envioLocalidadTexto]);

  // Próximo reparto del Colegio de Farmacéuticos según el calendario CFC
  // fijo — depende solo de la fecha de HOY (server), nunca de la
  // localidad. `hoy` llega como prop desde el server (query ?hoy= fuera
  // de producción, si no el reloj real) para que nunca dependa del reloj
  // del navegador del paciente.
  const repartoColegio = useMemo(() => proximoRepartoColegio(new Date(hoy)), [hoy]);
  const fechaColegioTexto = repartoColegio ? fechaRepartoTexto(repartoColegio) : null;

  // C2 (14-nov): "Comentarios" es un solo campo genérico para las 4
  // modalidades (antes solo Envío y Badra lo guardaban en algún lado —
  // RED y Colegio lo perdían en silencio porque ni se los mostraba).
  // Viaja en `direccionEnvio` de la cotización, el mismo campo que ya
  // usa Seguimiento para mostrar "Dirección de envío" (columna genérica,
  // ya se usaba para notas que no son una dirección — p. ej. "Llega por
  // Colegio: …" — confirmado leyendo contacto-externa/Seguimiento.tsx en
  // el repo padre; no hizo falta tocar nada ahí).
  const comentario = referencias.trim();
  const direccionParaGuardar =
    recibe === 'envio'
      ? direccionEnvioCompleta // ya incluye el comentario (ver más abajo)
      : recibe === 'retiro' && retiroModo === 'colegio'
        ? [fechaColegioTexto ? `Llega por Colegio: ${fechaColegioTexto}` : '', comentario].filter(Boolean).join(' — ')
        : recibe === 'retiro' && (retiroModo === 'badra' || retiroModo === 'red')
          ? comentario
          : '';

  // Guarda contacto/elección en Malvinas. Si falla, NO marca la clave como
  // guardada (para que el próximo Siguiente — o "Reintentar" — lo
  // reintente solo) y prende el aviso ámbar; nunca bloquea avanzar.
  async function guardarContacto() {
    const cel = celular.trim();
    const envioLocalidadEnviar = recibe === 'envio' && envioLocalidadTexto.trim() ? tituloLocalidad(envioLocalidadTexto.trim()) : '';
    // B1: la provincia viaja APARTE de la localidad — es lo único de lo
    // que depende el monto del lado del server (ver DESIGN.md, contrato
    // pendiente del lado de Malvinas).
    const envioProvinciaEnviar = recibe === 'envio' ? (provincia ?? '') : '';
    const retiroModoEnviar: RetiroModo = recibe === 'retiro' ? retiroModo : '';
    const retiroLugarEnviar =
      retiroModoEnviar === 'red'
        ? farmaciaRed
        : retiroModoEnviar === 'colegio'
          ? colegioLocalidad.trim()
          : retiroModoEnviar === 'badra'
            ? RETIRO_LUGAR_BADRA
            : '';
    const tipoEnviar = pago === 'cuotas' ? 'cuotas' : 'contado';
    const envioMontoEnviar = envioLocalidadEnviar ? (payload.envioAdentro ? 0 : (montoEnvioCalculado ?? 0)) : null;

    if (!cel && !direccionParaGuardar && !envioLocalidadEnviar && !retiroModoEnviar) return;
    const clave = JSON.stringify([
      cel,
      direccionParaGuardar,
      envioLocalidadEnviar,
      envioProvinciaEnviar,
      retiroModoEnviar,
      retiroLugarEnviar,
      tipoEnviar,
    ]);
    if (clave === ultimoContacto.current) return;

    try {
      const res = await fetch('/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fuente,
          celular: cel,
          direccion: direccionParaGuardar,
          envioLocalidad: envioLocalidadEnviar,
          envioProvincia: envioProvinciaEnviar,
          envioMonto: envioMontoEnviar,
          retiroModo: retiroModoEnviar,
          retiroLugar: retiroLugarEnviar,
          tipo: tipoEnviar,
        }),
      });
      if (!res.ok) throw new Error();
      ultimoContacto.current = clave;
      setErrorContacto(false);
    } catch {
      setErrorContacto(true);
    }
  }

  // Cambiar de pago cambia el total esperado (contado ↔ cuotas): se
  // vuelve a guardar contacto DESPUÉS de que el estado se actualice (el
  // efecto ve el `pago` nuevo; llamar a guardarContacto directamente
  // desde el handler todavía vería el valor viejo por el closure).
  const primerRenderPago = useRef(true);
  useEffect(() => {
    if (primerRenderPago.current) {
      primerRenderPago.current = false;
      return;
    }
    guardarContacto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pago]);

  // "Ir a pagar" te saca del sitio (window.location.href al init_point de
  // MP): si volvés con el botón atrás del navegador, Chrome suele
  // restaurar la página desde bfcache tal cual quedó (cargandoMP: true
  // congelado para siempre, porque el fetch que lo iba a apagar ya
  // corrió antes de irte). Estos dos efectos cubren las dos formas de
  // "volver": salir del paso de Pagar adentro de la SPA (Volver / atrás
  // cambia el paso) y volver desde afuera vía bfcache (pageshow
  // persisted).
  useEffect(() => {
    if (paso !== 3) return;
    return () => {
      setCargandoMP(false);
      setErrorMP('');
    };
  }, [paso]);

  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setCargandoMP(false);
        setErrorMP('');
      }
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  // C4 (16-nov): "Ya envié el comprobante" ya no sube ningún archivo — el
  // paciente lo manda por WhatsApp. Esto solo le avisa a Malvinas (best
  // effort: ver /api/comprobante) y después navega afuera del wizard, a
  // /gracias, igual que al volver de Mercado Pago. Nunca frena al
  // paciente: pase lo que pase con el aviso, siempre termina en /gracias.
  async function avisarComprobanteEnviado() {
    setEnviandoAviso(true);
    try {
      await guardarContacto();
      await fetch('/api/comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuente, celular: celular.trim() }),
      });
    } catch {
      // No bloquea: el comprobante ya le llegó a Atención por WhatsApp.
    } finally {
      // C5 (16-nov): nombre/o/monto viajan en la URL para que /gracias
      // pueda armar el mismo mensaje de WhatsApp de C4 si el paciente
      // cerró la pestaña sin mandarlo — /gracias es un server component,
      // no tiene el estado del checkout.
      const params = new URLSearchParams({
        transferencia: '1',
        nombre: payload.n,
        o: String(payload.o),
        monto: String(Math.round(t.contado)),
      });
      window.location.href = `/gracias?${params.toString()}`;
    }
  }

  async function pagarConMP() {
    setCargandoMP(true);
    setErrorMP('');
    try {
      await guardarContacto();
      const res = await fetch('/api/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fuente,
          retiroModo: recibe === 'retiro' ? retiroModo : '',
          retiroLugar:
            recibe === 'retiro'
              ? retiroModo === 'red'
                ? farmaciaRed
                : retiroModo === 'badra'
                  ? RETIRO_LUGAR_BADRA
                  : colegioLocalidad.trim()
              : '',
          envioLocalidad: recibe === 'envio' && envioLocalidadTexto.trim() ? tituloLocalidad(envioLocalidadTexto.trim()) : '',
          envioProvincia: recibe === 'envio' ? (provincia ?? '') : '',
          tipo: pago === 'cuotas' ? 'cuotas' : 'contado',
          celular: celular.trim(),
          direccionTexto: recibe === 'envio' ? direccionCorta : '',
          retiroFechaColegio: recibe === 'retiro' && retiroModo === 'colegio' ? (fechaColegioTexto ?? '') : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.init_point) throw new Error(data?.error ?? 'No pudimos iniciar el pago — probá de nuevo en un ratito');
      window.location.href = data.init_point;
    } catch (e: any) {
      setErrorMP(e.message ?? 'No pudimos iniciar el pago — probá de nuevo en un ratito');
      setCargandoMP(false);
    }
  }

  if (!listo) {
    return <div className="tarjeta" style={{ minHeight: 520, background: '#edf2f8' }} />;
  }

  // Shell único (tarjeta blanca + piso de alto) para las 5 pantallas del
  // wizard (C2, 14-nov: bajaron de 6 a 5 al fusionar el viejo Paso 2 con
  // el 1 y el 3) — cada PasoN devuelve solo su contenido y el alto se
  // fija acá, una sola vez, parejo para las 5.
  let contenido: React.ReactNode = null;

  if (paso === 0) {
    contenido = (
      <Home
        nombre={payload.n}
        li={li}
        contado={payload.tr}
        cuotaSinEnvio={cuotaDeLista(li)}
        whatsapp={whatsapp}
        comprobanteRecibido={comprobanteRecibido}
        onEmpezar={() => irA(1)}
      />
    );
  } else if (paso === 1) {
    contenido = (
      <Paso1Recibir
        cotizacion={payload.o}
        hayEnvios={!!payload.envios}
        recibe={recibe}
        retiroModo={retiroModo}
        whatsapp={whatsapp}
        errorContacto={errorContacto}
        onReintentarContacto={guardarContacto}
        onElegirRecibe={(r) => dispatch({ type: 'elegirRecibe', valor: r })}
        onElegirRetiroModo={(m) => dispatch({ type: 'elegirRetiroModo', valor: m })}
        leyendaEnvio={payload.envios?.leyenda ?? ''}
        envioAdentro={payload.envioAdentro}
        localidades={localidades}
        farmaciaRed={farmaciaRed}
        setFarmaciaRed={(v) => campo('farmaciaRed', v)}
        colegioLocalidad={colegioLocalidad}
        setColegioLocalidad={(v) => campo('colegioLocalidad', v)}
        fechaColegioTexto={fechaColegioTexto}
        envioLocalidadTexto={envioLocalidadTexto}
        setEnvioLocalidadTexto={cambiarLocalidadEnvio}
        avisoLocalidadCambiada={avisoLocalidadCambiada}
        provincia={provincia}
        setProvincia={(v) => campo('provincia', v)}
        calle={calle}
        setCalle={(v) => {
          setAvisoLocalidadCambiada(false);
          campo('calle', v);
        }}
        direccionVerificada={direccionVerificada}
        setDireccionVerificada={(v) => campo('direccionVerificada', v)}
        direccionConfirmadaTexto={direccionConfirmadaTexto}
        setDireccionConfirmadaTexto={(v) => campo('direccionConfirmadaTexto', v)}
        faltaAltura={faltaAltura}
        setFaltaAltura={(v) => campo('faltaAltura', v)}
        cp={cp}
        setCp={(v) => campo('cp', v)}
        onUsarLocalidadGoogle={usarLocalidadGoogle}
        avisoPrecioActualizado={avisoPrecioActualizado}
        onBlurGuardar={guardarContacto}
        onSiguiente={() => {
          guardarContacto();
          irA(2);
        }}
        onVolver={volver}
      />
    );
  }

  // Cómo lo recibe, en una frase — la misma base para el resumen del paso
  // de Pagar con Mercado Pago (antes de pagar).
  const reciboElegido: ReciboElegido | null =
    recibe === 'retiro' && retiroModo === 'red'
      ? { modo: 'red', sucursal: farmaciaRed }
      : recibe === 'retiro' && retiroModo === 'colegio'
        ? { modo: 'colegio', localidad: colegioLocalidad.trim(), fecha: fechaColegioTexto ?? undefined }
        : recibe === 'retiro' && retiroModo === 'badra'
          ? { modo: 'badra' }
          : recibe === 'envio'
            ? { modo: 'envio', direccion: direccionCorta }
            : null;
  const recibo = reciboElegido ? descripcionRecibo(reciboElegido) : '';

  // Resumen corto de 2 líneas para el paso 4 con Mercado Pago: qué eligió
  // y a qué celular le avisamos, para que la pantalla tenga sentido antes
  // de pagar (antes era solo el botón, sin ningún contexto).
  const resumenPaso4: string[] = [];
  if (recibo) {
    const montoTexto =
      recibe === 'envio'
        ? t.envio > 0
          ? ` (${formatoPeso(t.envio)})`
          : payload.envioAdentro
            ? ' (envío incluido en el precio)'
            : ''
        : '';
    resumenPaso4.push(recibo.charAt(0).toUpperCase() + recibo.slice(1) + montoTexto);
  }
  if (celular.trim()) resumenPaso4.push(`Te avisamos al ${celular.trim()}`);

  if (paso === 2 && recibe) {
    const barraTexto =
      recibe === 'retiro'
        ? 'Tratamiento (retiro sin cargo)'
        : payload.envioAdentro
          ? 'Tratamiento (envío incluido en el precio)'
          : `Tratamiento + envío a ${tituloLocalidad(envioLocalidadTexto.trim())}`;
    contenido = (
      <Paso3Pago
        cotizacion={payload.o}
        recibe={recibe}
        barraTexto={barraTexto}
        totalMostrado={pago === 'cuotas' ? t.cuotas : t.contado}
        contado={t.contado}
        cuota={t.cuota}
        pago={pago}
        onElegirPago={(p) => campo('pago', p)}
        celular={celular}
        setCelular={(v) => campo('celular', v)}
        celularDeMalvinas={payload.paciente?.celular}
        referencias={referencias}
        setReferencias={(v) => campo('referencias', v)}
        onBlurGuardar={guardarContacto}
        whatsapp={whatsapp}
        errorContacto={errorContacto}
        onReintentarContacto={guardarContacto}
        onSiguiente={() => {
          guardarContacto();
          irA(3);
        }}
        onVolver={volver}
      />
    );
  }

  if (paso === 3) {
    contenido = (
      <Paso4Pagar
        cotizacion={payload.o}
        nombre={payload.n}
        pago={pago}
        monto={pago === 'cuotas' ? t.cuotas : t.contado}
        cuota={t.cuota}
        comprobanteRecibido={comprobanteRecibido}
        enviandoAviso={enviandoAviso}
        onEnviarComprobante={avisarComprobanteEnviado}
        cargandoMP={cargandoMP}
        errorMP={errorMP}
        onPagarMP={pagarConMP}
        resumen={resumenPaso4}
        whatsapp={whatsapp}
        onVolver={volver}
      />
    );
  }

  return (
    <div className="tarjeta fade-paso flex min-h-[520px] flex-col">
      {contenido}
    </div>
  );
}
