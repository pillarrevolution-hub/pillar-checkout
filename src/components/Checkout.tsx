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
import { buscarTarifa, tituloLocalidad } from '@/lib/envios';
import { descripcionRecibo, mensajeConfirmacion, reciboMostrado, type ReciboElegido } from '@/lib/mensajes';
import { FARMACIAS_RED } from '@/lib/farmaciasRed';
import { RETIRO_LUGAR_BADRA } from '@/lib/farmaciaBadra';
import { proximoRepartoColegio, fechaRepartoTexto } from '@/lib/colegioFechas';
import Home from './checkout/Home';
import Paso1Recibir from './checkout/Paso1Recibir';
import Paso3Pago, { type Pago } from './checkout/Paso3Pago';
import Paso4Pagar from './checkout/Paso4Pagar';
import Paso5Confirmacion from './checkout/Paso5Confirmacion';

// ---------------------------------------------------------------
// Checkout PILL.AR v3 — UNA sola versión (decisión de Tomi): Home + paso
// a paso de 4 pantallas. Retiro en Farmacia RED / Colegio de
// Farmacéuticos, envío a domicilio por localidad con precio al instante
// (tarifario vivo de Malvinas), sin fecha de entrega. `history.pushState`
// por paso para que el botón "atrás" del celular funcione. Todo el estado
// del paso a paso vive en UN reducer (v3.1) que se guarda en
// sessionStorage en cada cambio — un refresh accidental no pierde nada
// (nunca en localStorage: el celular no debe sobrevivir más que la
// pestaña).
// ---------------------------------------------------------------

// C2 (14-nov): bajó de 6 a 5 pantallas — el viejo Paso 2 ("Datos", los
// campos propios de cada modalidad) se fusionó con el Paso 1 (acordeón)
// y con "¿Cómo querés pagar?" (celular + comentarios). Flujo numerado
// (PasoHeader, "de 3"): 1 Recibir → 2 Pago → 3 Pagar; 0 Home y 4
// Confirmación quedan sin número visible, como antes.
type Paso = 0 | 1 | 2 | 3 | 4;
type Recibe = 'retiro' | 'envio' | null;
type RetiroModo = 'red' | 'colegio' | 'badra' | '';

type Estado = {
  paso: Paso;
  recibe: Recibe;
  retiroModo: RetiroModo;
  farmaciaRed: string;
  colegioLocalidad: string;
  envioLocalidadTexto: string;
  calle: string;
  // Verificación de dirección con Google Places (v3.2, tema 2/3):
  // direccionVerificada nunca bloquea nada, solo decide si
  // guardarContacto le suma "⚠ Dirección sin verificar" al final.
  // direccionConfirmadaTexto es la formattedAddress de Google, para la
  // línea "✓ {formateada}" — vive en el estado (no local al combobox)
  // para sobrevivir al desmontaje/montaje del paso al volver.
  direccionVerificada: boolean;
  direccionConfirmadaTexto: string;
  piso: string;
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
  calle: '',
  direccionVerificada: false,
  direccionConfirmadaTexto: '',
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
        ...(huboDireccion ? { calle: '', direccionVerificada: false, direccionConfirmadaTexto: '' } : {}),
      };
    }
    case 'elegirRecibe':
      return accion.valor === 'envio'
        ? { ...estado, recibe: 'envio', retiroModo: '', farmaciaRed: '', colegioLocalidad: '' }
        : {
            ...estado,
            recibe: 'retiro',
            envioLocalidadTexto: '',
            calle: '',
            direccionVerificada: false,
            direccionConfirmadaTexto: '',
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

function claveDraft(o: number): string {
  return `pillar-checkout-draft-${o}`;
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
    calle,
    direccionVerificada,
    direccionConfirmadaTexto,
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
  // que el combobox ya marcó como verificada).
  //
  // C3 (impeccable, 14-sep): este cambio de localidad puede cambiar
  // cuánto paga el paciente por el envío — el botón que dispara esto ya
  // muestra el precio nuevo ANTES de tocarlo (DireccionCombobox), pero
  // acá además se compara contra el precio ANTERIOR (el de la localidad
  // que el paciente había tipeado) para decidir si hace falta resaltar
  // la caja de precio y anunciarlo — si no cambió (p. ej. envioAdentro,
  // que siempre da $0), no se avisa nada: un aviso que nunca cambia
  // enseña a ignorar los avisos.
  function usarLocalidadGoogle(localidadCanonica: string) {
    const tarifaNueva = buscarTarifa(localidadCanonica, tarifas);
    const montoAnterior = payload.envioAdentro ? 0 : (tarifaEncontrada ? tarifaEncontrada.m : null);
    const montoNuevo = payload.envioAdentro ? 0 : (tarifaNueva ? tarifaNueva.m : null);
    // localidadCanonica viene de TarifaEnvio.l — MAYÚSCULAS, como está
    // en el tarifario. El campo de localidad siempre muestra el nombre
    // prolijo (mismo criterio que el datalist de sugerencias).
    campo('envioLocalidadTexto', tituloLocalidad(localidadCanonica));
    if (montoNuevo !== null && montoNuevo !== montoAnterior) {
      setAvisoPrecioActualizado(formatoPeso(montoNuevo));
    }
  }

  // Se apaga sola: el resaltado y el anuncio son un instante, no un
  // estado permanente de la pantalla.
  const [avisoPrecioActualizado, setAvisoPrecioActualizado] = useState<string | null>(null);
  useEffect(() => {
    if (!avisoPrecioActualizado) return;
    const t = setTimeout(() => setAvisoPrecioActualizado(null), 4000);
    return () => clearTimeout(t);
  }, [avisoPrecioActualizado]);

  // Hasta que el borrador se restaure (o se confirme que no había
  // ninguno), no sabemos qué paso mostrar: mientras tanto se pinta un
  // placeholder neutro (nunca la Home) para que el HTML del server y el
  // primer render del cliente coincidan siempre, sea cual sea el paso
  // real al que se vaya a volver.
  const [listo, setListo] = useState(false);

  const [subiendo, setSubiendo] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState('');
  const [comprobanteListo, setComprobanteListo] = useState(false);
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

  const tarifas = payload.envios?.tarifas ?? [];
  const localidades = payload.localidades ?? [];
  const tarifaEncontrada = recibe === 'envio' ? buscarTarifa(envioLocalidadTexto, tarifas) : null;

  const eleccion: EleccionEnvio = useMemo(() => {
    if (recibe === 'envio' && tarifaEncontrada) {
      return { modo: 'envio', monto: payload.envioAdentro ? 0 : tarifaEncontrada.m };
    }
    return { modo: 'retiro' };
  }, [recibe, tarifaEncontrada, payload.envioAdentro]);

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
    const localidadDisplay = tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : envioLocalidadTexto.trim();
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
  }, [recibe, calle, piso, cp, referencias, tarifaEncontrada, envioLocalidadTexto, direccionVerificada]);

  const direccionCorta = useMemo(() => {
    const localidadDisplay = tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : envioLocalidadTexto.trim();
    return [calle.trim(), piso.trim()].filter(Boolean).join(' ').concat(localidadDisplay ? `, ${localidadDisplay}` : '');
  }, [calle, piso, tarifaEncontrada, envioLocalidadTexto]);

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
    const envioLocalidadEnviar = recibe === 'envio' && tarifaEncontrada ? tarifaEncontrada.l : '';
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
    const envioMontoEnviar = envioLocalidadEnviar ? (payload.envioAdentro ? 0 : (tarifaEncontrada?.m ?? 0)) : null;

    if (!cel && !direccionParaGuardar && !envioLocalidadEnviar && !retiroModoEnviar) return;
    const clave = JSON.stringify([cel, direccionParaGuardar, envioLocalidadEnviar, retiroModoEnviar, retiroLugarEnviar, tipoEnviar]);
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

  // Fotos de celular vienen de 5-10 MB y el límite del server es ~3.5 MB:
  // las imágenes grandes se achican en el navegador (máx. 1800 px, JPEG)
  // antes de subir. Los PDF van tal cual (con tope).
  async function archivoABase64(file: File): Promise<{ base64: string; mime: string; nombre: string }> {
    const esImagen = file.type === 'image/jpeg' || file.type === 'image/png';
    if (esImagen && file.size > 900_000) {
      const bitmap = await createImageBitmap(file);
      const escala = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * escala);
      canvas.height = Math.round(bitmap.height * escala);
      canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      return { base64: dataUrl.split(',')[1] ?? '', mime: 'image/jpeg', nombre: file.name.replace(/\.\w+$/, '') + '.jpg' };
    }
    if (file.size > 3_400_000) {
      throw new Error('El archivo es muy pesado (máx. 3,5 MB). Probá con una foto o un PDF más liviano.');
    }
    const base64 = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    return { base64, mime: file.type, nombre: file.name };
  }

  async function enviarComprobante(archivo: File) {
    setSubiendo(true);
    setErrorComprobante('');
    try {
      await guardarContacto();
      const { base64, mime, nombre } = await archivoABase64(archivo);
      const res = await fetch('/api/comprobante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuente, nombreArchivo: nombre, mime, datosBase64: base64 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'No pudimos subir el comprobante — probá de nuevo');
      setComprobanteListo(true);
      irA(4);
    } catch (e: any) {
      setErrorComprobante(e.message ?? 'No pudimos subir el comprobante — probá de nuevo');
    } finally {
      setSubiendo(false);
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
          envioLocalidad: recibe === 'envio' && tarifaEncontrada ? tarifaEncontrada.l : '',
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
        comprobanteListo={comprobanteListo}
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
        tarifas={tarifas}
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
        calle={calle}
        setCalle={(v) => {
          setAvisoLocalidadCambiada(false);
          campo('calle', v);
        }}
        direccionVerificada={direccionVerificada}
        setDireccionVerificada={(v) => campo('direccionVerificada', v)}
        direccionConfirmadaTexto={direccionConfirmadaTexto}
        setDireccionConfirmadaTexto={(v) => campo('direccionConfirmadaTexto', v)}
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
  // 4 (antes de pagar) y para el mensaje de confirmación del paso 5.
  // `reciboVisible` es solo para la caja "Recibís:" (Confirmación):
  // camino Colegio usa "· llega el {fecha}" ahí, y "(Colegio, llega el
  // {fecha})" en el resto (resumen del paso 4, mensaje de WhatsApp).
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
  const reciboVisible = reciboElegido ? reciboMostrado(reciboElegido) : '';

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
          : `Tratamiento + envío a ${tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : ''}`;
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
        pago={pago}
        monto={pago === 'cuotas' ? t.cuotas : t.contado}
        cuota={t.cuota}
        comprobanteRecibido={comprobanteRecibido && !comprobanteListo}
        subiendo={subiendo}
        errorComprobante={errorComprobante}
        onEnviarComprobante={enviarComprobante}
        cargandoMP={cargandoMP}
        errorMP={errorMP}
        onPagarMP={pagarConMP}
        resumen={resumenPaso4}
        whatsapp={whatsapp}
        onVolver={volver}
      />
    );
  }

  if (paso === 4) {
    const mensaje = mensajeConfirmacion({
      nombre: payload.n,
      o: payload.o,
      accion: `transferir ${formatoPeso(t.contado)} al alias pill.ar y subí el comprobante`,
      recibo,
      celular: celular.trim() || 's/d',
    });
    contenido = (
      <Paso5Confirmacion
        nombre={payload.n}
        monto={t.contado}
        recibo={reciboVisible}
        celular={celular.trim()}
        mensajeWhatsApp={mensaje}
        whatsapp={whatsapp}
        farmaciaRedInfo={
          recibe === 'retiro' && retiroModo === 'red'
            ? FARMACIAS_RED.find((f) => f.nombre === farmaciaRed)
            : undefined
        }
        colegioInfo={
          recibe === 'retiro' && retiroModo === 'colegio'
            ? { localidad: colegioLocalidad.trim(), o: payload.o, nombre: payload.n }
            : undefined
        }
        mostrarBadraInfo={recibe === 'retiro' && retiroModo === 'badra'}
      />
    );
  }

  return (
    <div className={`tarjeta fade-paso flex min-h-[520px] flex-col${paso === 4 ? ' text-center' : ''}`}>
      {contenido}
    </div>
  );
}
