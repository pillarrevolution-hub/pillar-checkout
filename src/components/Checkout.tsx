'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  formatoPeso,
  listaDerivada,
  montoEnvio,
  total,
  type EleccionEnvio,
  type PayloadCheckout,
} from '@/lib/firma';
import { buscarTarifa, tituloLocalidad } from '@/lib/envios';
import { descripcionRecibo, mensajeConfirmacion } from '@/lib/mensajes';
import Home from './checkout/Home';
import Paso1Recibir from './checkout/Paso1Recibir';
import Paso2Datos from './checkout/Paso2Datos';
import Paso3Pago, { type Pago } from './checkout/Paso3Pago';
import Paso4Pagar from './checkout/Paso4Pagar';
import Paso5Confirmacion from './checkout/Paso5Confirmacion';

// ---------------------------------------------------------------
// Checkout PILL.AR v3 — UNA sola versión (decisión de Tomi): Home + paso
// a paso de 4 pantallas. Retiro en Farmacia RED / Colegio de
// Farmacéuticos, envío a domicilio por localidad con precio al instante
// (tarifario vivo de Malvinas), sin fecha de entrega. `history.pushState`
// por paso para que el botón "atrás" del celular funcione.
// ---------------------------------------------------------------

type Paso = 0 | 1 | 2 | 3 | 4 | 5;
type Recibe = 'retiro' | 'envio' | null;
type RetiroModo = 'red' | 'colegio' | '';

export default function Checkout({
  payload,
  fuente,
  whatsapp,
  comprobanteRecibido = false,
}: {
  payload: PayloadCheckout;
  fuente: { c: string; t: string } | { p: string; t: string };
  whatsapp: string | null;
  comprobanteRecibido?: boolean;
}) {
  const [paso, setPaso] = useState<Paso>(0);
  const [recibe, setRecibe] = useState<Recibe>(null);
  const [retiroModo, setRetiroModo] = useState<RetiroModo>('');
  const [farmaciaRed, setFarmaciaRed] = useState('');
  const [colegioLocalidad, setColegioLocalidad] = useState('');
  const [envioLocalidadTexto, setEnvioLocalidadTexto] = useState('');
  const [calle, setCalle] = useState('');
  const [piso, setPiso] = useState('');
  const [cp, setCp] = useState('');
  const [referencias, setReferencias] = useState('');
  const [comentariosRetiro, setComentariosRetiro] = useState('');
  const [celular, setCelular] = useState('');
  const [pago, setPago] = useState<Pago>('transferencia');

  const [subiendo, setSubiendo] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState('');
  const [comprobanteListo, setComprobanteListo] = useState(false);
  const [cargandoMP, setCargandoMP] = useState(false);
  const [errorMP, setErrorMP] = useState('');

  const ultimoContacto = useRef('');

  // history.pushState por paso: el botón "atrás" del celular funciona
  // como el botón "Volver" de cada pantalla.
  useEffect(() => {
    window.history.replaceState({ paso: 0 }, '');
    function onPop(e: PopStateEvent) {
      const p = (e.state as { paso?: number } | null)?.paso;
      setPaso((typeof p === 'number' ? p : 0) as Paso);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function irA(n: Paso) {
    setPaso(n);
    window.history.pushState({ paso: n }, '');
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
  const t = useMemo(
    () => ({
      contado: total(payload, eleccion, 'contado'),
      cuotas: total(payload, eleccion, 'cuotas'),
      cuota: Math.round((li + montoEnvio(eleccion)) / 3),
      envio: montoEnvio(eleccion),
    }),
    [payload, eleccion, li]
  );

  const direccionEnvioCompleta = useMemo(() => {
    if (recibe !== 'envio') return '';
    const localidadDisplay = tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : envioLocalidadTexto.trim();
    return [
      calle.trim(),
      piso.trim(),
      localidadDisplay && cp.trim() ? `${localidadDisplay} (CP ${cp.trim()})` : localidadDisplay || (cp.trim() ? `CP ${cp.trim()}` : ''),
    ]
      .filter(Boolean)
      .join(', ')
      .concat(referencias.trim() ? ` — ${referencias.trim()}` : '');
  }, [recibe, calle, piso, cp, referencias, tarifaEncontrada, envioLocalidadTexto]);

  const direccionCorta = useMemo(() => {
    const localidadDisplay = tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : envioLocalidadTexto.trim();
    return [calle.trim(), piso.trim()].filter(Boolean).join(' ').concat(localidadDisplay ? `, ${localidadDisplay}` : '');
  }, [calle, piso, tarifaEncontrada, envioLocalidadTexto]);

  const direccionParaGuardar = recibe === 'envio' ? direccionEnvioCompleta : comentariosRetiro.trim();

  async function guardarContacto() {
    const cel = celular.trim();
    const envioLocalidadEnviar = recibe === 'envio' && tarifaEncontrada ? tarifaEncontrada.l : '';
    const retiroModoEnviar: RetiroModo = recibe === 'retiro' ? retiroModo : '';
    const retiroLugarEnviar =
      retiroModoEnviar === 'red' ? farmaciaRed : retiroModoEnviar === 'colegio' ? colegioLocalidad.trim() : '';
    const tipoEnviar = pago === 'cuotas' ? 'cuotas' : 'contado';
    const envioMontoEnviar = envioLocalidadEnviar ? (payload.envioAdentro ? 0 : (tarifaEncontrada?.m ?? 0)) : null;

    if (!cel && !direccionParaGuardar && !envioLocalidadEnviar && !retiroModoEnviar) return;
    const clave = JSON.stringify([cel, direccionParaGuardar, envioLocalidadEnviar, retiroModoEnviar, retiroLugarEnviar, tipoEnviar]);
    if (clave === ultimoContacto.current) return;
    ultimoContacto.current = clave;

    await fetch('/api/contacto', {
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
    }).catch(() => {});
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
      irA(5);
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
          retiroLugar: recibe === 'retiro' ? (retiroModo === 'red' ? farmaciaRed : colegioLocalidad.trim()) : '',
          envioLocalidad: recibe === 'envio' && tarifaEncontrada ? tarifaEncontrada.l : '',
          tipo: pago === 'cuotas' ? 'cuotas' : 'contado',
          celular: celular.trim(),
          direccionTexto: recibe === 'envio' ? direccionCorta : '',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.init_point) throw new Error(data?.error ?? 'No pudimos iniciar el pago');
      window.location.href = data.init_point;
    } catch (e: any) {
      setErrorMP(e.message ?? 'No pudimos iniciar el pago — probá de nuevo en un ratito');
      setCargandoMP(false);
    }
  }

  if (paso === 0) {
    return (
      <Home
        nombre={payload.n}
        li={li}
        contado={payload.tr}
        cuotaSinEnvio={Math.round(li / 3)}
        whatsapp={whatsapp}
        comprobanteRecibido={comprobanteRecibido}
        comprobanteListo={comprobanteListo}
        onEmpezar={() => irA(1)}
      />
    );
  }

  if (paso === 1) {
    return (
      <Paso1Recibir
        cotizacion={payload.o}
        hayEnvios={!!payload.envios}
        recibe={recibe}
        retiroModo={retiroModo}
        whatsapp={whatsapp}
        onElegirRecibe={setRecibe}
        onElegirRetiroModo={setRetiroModo}
        onSiguiente={() => {
          guardarContacto();
          irA(2);
        }}
        onVolver={volver}
      />
    );
  }

  if (paso === 2 && recibe) {
    return (
      <Paso2Datos
        cotizacion={payload.o}
        recibe={recibe}
        retiroModo={retiroModo}
        tarifas={tarifas}
        leyendaEnvio={payload.envios?.leyenda ?? ''}
        localidades={localidades}
        whatsapp={whatsapp}
        farmaciaRed={farmaciaRed}
        setFarmaciaRed={setFarmaciaRed}
        colegioLocalidad={colegioLocalidad}
        setColegioLocalidad={setColegioLocalidad}
        envioLocalidadTexto={envioLocalidadTexto}
        setEnvioLocalidadTexto={setEnvioLocalidadTexto}
        calle={calle}
        setCalle={setCalle}
        piso={piso}
        setPiso={setPiso}
        cp={cp}
        setCp={setCp}
        referencias={referencias}
        setReferencias={setReferencias}
        comentarios={comentariosRetiro}
        setComentarios={setComentariosRetiro}
        celular={celular}
        setCelular={setCelular}
        onBlurGuardar={guardarContacto}
        onIrARetiro={() => {
          setRecibe('retiro');
          setRetiroModo('');
          irA(1);
        }}
        onSiguiente={() => {
          guardarContacto();
          irA(3);
        }}
        onVolver={volver}
      />
    );
  }

  if (paso === 3) {
    const barraTexto =
      recibe === 'retiro'
        ? 'Tratamiento (retiro sin cargo)'
        : payload.envioAdentro
          ? 'Tratamiento (envío incluido en el precio)'
          : `Tratamiento + envío a ${tarifaEncontrada ? tituloLocalidad(tarifaEncontrada.l) : ''}`;
    return (
      <Paso3Pago
        cotizacion={payload.o}
        barraTexto={barraTexto}
        totalMostrado={pago === 'cuotas' ? t.cuotas : t.contado}
        contado={t.contado}
        cuota={t.cuota}
        pago={pago}
        onElegirPago={setPago}
        whatsapp={whatsapp}
        onSiguiente={() => irA(4)}
        onVolver={volver}
      />
    );
  }

  if (paso === 4) {
    return (
      <Paso4Pagar
        cotizacion={payload.o}
        pago={pago}
        monto={pago === 'cuotas' ? t.cuotas : t.contado}
        subiendo={subiendo}
        errorComprobante={errorComprobante}
        onEnviarComprobante={enviarComprobante}
        cargandoMP={cargandoMP}
        errorMP={errorMP}
        onPagarMP={pagarConMP}
        whatsapp={whatsapp}
        onVolver={volver}
      />
    );
  }

  if (paso === 5) {
    const recibo =
      recibe === 'retiro' && retiroModo === 'red'
        ? descripcionRecibo({ modo: 'red', sucursal: farmaciaRed })
        : recibe === 'retiro' && retiroModo === 'colegio'
          ? descripcionRecibo({ modo: 'colegio', localidad: colegioLocalidad.trim() })
          : descripcionRecibo({ modo: 'envio', direccion: direccionCorta });
    const mensaje = mensajeConfirmacion({
      nombre: payload.n,
      o: payload.o,
      accion: `transferir ${formatoPeso(t.contado)} al alias pill.ar y subí el comprobante`,
      recibo,
      celular: celular.trim() || 's/d',
    });
    return (
      <Paso5Confirmacion
        nombre={payload.n}
        monto={t.contado}
        recibo={recibo}
        celular={celular.trim()}
        mensajeWhatsApp={mensaje}
        whatsapp={whatsapp}
      />
    );
  }

  return null;
}
