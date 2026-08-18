'use client';
import { useMemo, useRef, useState } from 'react';
import {
  formatoPeso,
  montoEnvio,
  total,
  type OpcionEnvio,
  type PayloadCheckout,
} from '@/lib/firma';

// ---------------------------------------------------------------
// Checkout PILL.AR — estética alineada a la web de referencia del equipo
// (sim.pill.ar, "a todos les gustó más esa"): tarjeta única, "Hola,
// Nombre." con la FUENTE DEL SISTEMA (v2.3.1 — mismo stack que el CEO,
// chau Times), precio en tarjeta navy con badge amarillo de descuento,
// pasos con círculo celeste, opciones con radio, resumen y
// botón azul a Mercado Pago. Diferencias de fondo que se conservan:
// transferencia al alias con botones de copiar, dos zonas de envío con
// precio al instante, y datos siempre vigentes desde Malvinas.
// Textos en clave de BENEFICIO (CEO): "15% de descuento", "3 cuotas sin
// interés" — nunca "te ahorrás / pagás más".
// ---------------------------------------------------------------

const ALIAS = 'pill.ar';
const TITULAR = 'PILL.AR S.A. · CUIT 30-71816734-1';

function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const f = new Date(Date.UTC(y, m - 1, d));
  return f.toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}

function Radio({ activo }: { activo: boolean }) {
  return (
    <span className={`radio relative ${activo ? 'border-[#3d8ee7]' : 'border-slate-300'} bg-white`}>
      {activo && <span className="absolute inset-[3px] rounded-full bg-[#3d8ee7]" />}
    </span>
  );
}

export default function Checkout({
  payload,
  fuente,
  whatsapp,
  comprobanteRecibido = false,
}: {
  payload: PayloadCheckout;
  // link corto {c, t} o formato viejo {p, t} — va tal cual a /api/preferencia
  fuente: { c: string; t: string } | { p: string; t: string };
  whatsapp: string | null;
  // v2.3: el paciente ya subió un comprobante antes (link corto) — se
  // muestra "en verificación" y puede subir otro si hace falta.
  comprobanteRecibido?: boolean;
}) {
  // Como en la web de referencia: retiro ya viene elegido. La transferencia
  // es la opción de pago inicial (v2.3, pedido de Tomi: "el alias está muy
  // escondido") — el alias se ve de una, sin tener que buscarlo.
  const [recibe, setRecibe] = useState<'retiro' | 'envio'>('retiro');
  const [zona, setZona] = useState<'cordoba' | 'fuera' | null>(null);
  const [pago, setPago] = useState<'transferencia' | 'mp' | 'cuotas'>('transferencia');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState<'alias' | 'monto' | null>(null);
  // Comprobante de transferencia (v2.3): el paciente lo sube acá mismo y
  // queda guardado en el pedido; Atención verifica la plata y confirma.
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [comprobanteListo, setComprobanteListo] = useState(false);
  const [errorComprobante, setErrorComprobante] = useState('');
  // Datos de contacto (v2.2, pedido de Tomi): celular siempre; dirección
  // solo si eligió envío a domicilio. Se guardan en Malvinas apenas los
  // completa (al salir del campo) — si paga por transferencia no hay
  // ningún aviso posterior, así que no se puede esperar al pago.
  const [celular, setCelular] = useState('');
  // Dirección DESGLOSADA (v2.3.1, campos de la web del CEO — Tomi: "ya veo
  // la gente poniendo la calle y no el número"): localidad, calle y número
  // y CP obligatorios; piso, barrio y referencias opcionales. A Malvinas
  // viaja TODO concatenado en un solo campo (así se ve en 📒 Seguimiento).
  const [localidad, setLocalidad] = useState('');
  const [calle, setCalle] = useState('');
  const [piso, setPiso] = useState('');
  const [cp, setCp] = useState('');
  const [barrio, setBarrio] = useState('');
  const [referencias, setReferencias] = useState('');
  const ultimoContacto = useRef('');

  const direccionCompleta = [
    calle.trim(),
    piso.trim(),
    barrio.trim(),
    localidad.trim() && cp.trim()
      ? `${localidad.trim()} (CP ${cp.trim()})`
      : localidad.trim() || (cp.trim() ? `CP ${cp.trim()}` : ''),
  ]
    .filter(Boolean)
    .join(', ')
    .concat(referencias.trim() ? ` — ${referencias.trim()}` : '');

  const envio: OpcionEnvio = recibe === 'retiro' ? 'colegio' : zona ?? 'cordoba';
  const envioElegido = recibe === 'retiro' || zona != null;

  const t = useMemo(() => {
    const contado = total(payload, envio, 'contado');
    const cuotas = total(payload, envio, 'cuotas');
    return {
      contado,
      cuotas,
      cuota: Math.round(cuotas / 3),
      envio: montoEnvio(payload, envio),
    };
  }, [payload, envio]);

  async function copiar(texto: string, que: 'alias' | 'monto') {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(que);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      /* seleccionar a mano */
    }
  }

  // Manda celular/dirección al server (y de ahí a Malvinas) si cambiaron.
  // Silencioso: nunca frena el pago por esto.
  async function guardarContacto() {
    const cel = celular.trim();
    const dir = recibe === 'envio' ? direccionCompleta : '';
    if (!cel && !dir) return;
    const clave = `${cel}|${dir}`;
    if (clave === ultimoContacto.current) return;
    ultimoContacto.current = clave;
    await fetch('/api/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...fuente, celular: cel, direccion: dir }),
    }).catch(() => {});
  }

  const celularOk = celular.replace(/\D/g, '').length >= 6;
  const direccionOk = localidad.trim().length >= 2 && calle.trim().length >= 4 && cp.trim().length >= 3;
  const contactoOk = celularOk && (recibe === 'retiro' || direccionOk);

  // Cruce zona ↔ localidad (Tomi: "poniendo una dirección que coincide con
  // la de Córdoba capital y en realidad es de un pueblo del interior").
  // Aviso suave, no bloquea.
  const normLoc = localidad.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const pareceCapital = normLoc === 'cordoba' || normLoc === 'cordoba capital' || normLoc === 'cba';
  const avisoZona =
    recibe === 'envio' && localidad.trim() && zona != null
      ? zona === 'cordoba' && !normLoc.includes('cordoba') && normLoc !== 'cba'
        ? `⚠ Elegiste envío en Córdoba capital pero la localidad es "${localidad.trim()}" — si es del interior, marcá "Resto de la provincia".`
        : zona === 'fuera' && pareceCapital
          ? '💡 Si tu dirección es de Córdoba capital, elegí esa opción de envío (cuesta menos).'
          : ''
      : '';

  async function pagarConMP() {
    setCargando(true);
    setError('');
    try {
      await guardarContacto();
      const res = await fetch('/api/preferencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fuente, envio, tipo: pago === 'cuotas' ? 'cuotas' : 'contado' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.init_point) throw new Error(data?.error ?? 'No pudimos iniciar el pago');
      window.location.href = data.init_point;
    } catch (e: any) {
      setError(e.message ?? 'No pudimos iniciar el pago — probá de nuevo en un ratito');
      setCargando(false);
    }
  }

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

  async function enviarComprobante() {
    if (!archivo) return;
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
    } catch (e: any) {
      setErrorComprobante(e.message ?? 'No pudimos subir el comprobante — probá de nuevo');
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="tarjeta">
      {/* Encabezado */}
      <span className="chip">Cotización personalizada</span>
      <h1 className="mt-3 font-sans text-4xl font-bold text-tinta">Hola, {payload.n}.</h1>
      <p className="mt-2 text-[15px] text-slate-500">
        Preparada por el equipo de PILL.AR. Elegí cómo recibirlo y cómo pagarlo.
      </p>

      {/* v2.3: ya subió un comprobante antes (dato vivo del link corto) */}
      {comprobanteRecibido && !comprobanteListo && (
        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-[14px] leading-relaxed text-violet-900">
          📎 <b>Ya recibimos tu comprobante</b> — lo estamos verificando y te confirmamos por
          WhatsApp. Si necesitás subir otro (por ejemplo, si el primero salió mal), podés hacerlo
          de nuevo acá abajo.
        </div>
      )}

      {/* La cotización primero (CEO): tarjeta navy con el precio */}
      <div className="mt-5 rounded-2xl bg-gradient-to-b from-[#0f2036] to-navy p-5 text-white">
        <p className="font-bold">Tratamiento personalizado con tecnología PILL.AR</p>
        <p className="mt-3 text-[15px] text-slate-300">
          Valor de tu tratamiento: <s className="text-slate-400">{formatoPeso(payload.li)}</s>
        </p>
        <p className="mt-1">
          <span className="font-sans text-4xl font-bold">{formatoPeso(payload.tr)}</span>
          <span className="ml-2 text-sm text-slate-300">pagando de contado</span>
        </p>
        <span className="mt-3 inline-block rounded-full bg-[#f2c94c] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-[#1c2430]">
          15% de descuento pagando de contado
        </span>
        {payload.d && (
          <p className="mt-3 text-xs text-slate-300">📦 Estimamos tenerlo listo el {fechaLarga(payload.d)}.</p>
        )}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        Tu medicamento será elaborado por Nueva Farmacia Badra.
      </p>

      {/* Paso 1 · ¿Cómo lo recibís? */}
      <div className="mt-6 flex items-center gap-2.5">
        <span className="paso">1</span>
        <h2 className="text-lg font-bold">¿Cómo lo recibís?</h2>
      </div>
      <div className="mt-3 space-y-2.5">
        <button
          className={`opcion ${recibe === 'retiro' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setRecibe('retiro')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'retiro'} />
            <span>
              <span className="block text-[15px] font-bold">Retiro en farmacia</span>
              <span className="block text-[13px] text-slate-500">Sin cargo.</span>
            </span>
          </span>
        </button>
        {recibe === 'retiro' && (
          <div className="rounded-xl bg-[#eaf3fd] p-4 text-[14px] leading-relaxed text-[#2d5175]">
            A través de un convenio con el Colegio de Farmacéuticos de la Provincia de Córdoba te
            informaremos en cuál farmacia de tu localidad podrás retirar cuando ya esté elaborado tu
            pedido.
          </div>
        )}
        <button
          className={`opcion ${recibe === 'envio' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setRecibe('envio')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={recibe === 'envio'} />
            <span>
              <span className="block text-[15px] font-bold">Envío a domicilio</span>
              <span className="block text-[13px] text-slate-500">
                Elegí tu zona y te mostramos el costo al instante.
              </span>
            </span>
          </span>
        </button>
        {recibe === 'envio' && (
          <div className="ml-6 space-y-2">
            {(
              [
                ['cordoba', 'Córdoba capital', payload.ec],
                ['fuera', 'Resto de la provincia', payload.el],
              ] as const
            ).map(([id, titulo, precio]) => (
              <button
                key={id}
                className={`opcion !p-3 ${zona === id ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                onClick={() => setZona(id)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-3">
                    <Radio activo={zona === id} />
                    <span className="text-[14px] font-bold">{titulo}</span>
                  </span>
                  <span className="text-[14px] font-extrabold text-tinta">+ {formatoPeso(precio)}</span>
                </span>
              </button>
            ))}

            {/* Dirección desglosada (v2.3.1, mismos campos que la web del
                CEO): así nadie manda la calle sin el número ni se olvida
                el depto. Guarda en Malvinas al salir de cada campo. */}
            <div className="space-y-2.5 pt-2">
              <div>
                <label className="mb-1 block text-[13px] font-bold text-tinta">Localidad</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                  placeholder="Ej: Alta Gracia" value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)} onBlur={guardarContacto} />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-bold text-tinta">Calle y número</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                  placeholder="Ej: Av. Colón 1234" value={calle}
                  onChange={(e) => setCalle(e.target.value)} onBlur={guardarContacto} />
              </div>
              <div className="flex gap-2.5">
                <div className="flex-1">
                  <label className="mb-1 block text-[13px] font-bold text-tinta">Piso / depto <span className="font-normal text-slate-400">(opcional)</span></label>
                  <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                    placeholder="Ej: 3° B" value={piso}
                    onChange={(e) => setPiso(e.target.value)} onBlur={guardarContacto} />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[13px] font-bold text-tinta">Código postal</label>
                  <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                    inputMode="numeric" placeholder="Ej: 5000" value={cp}
                    onChange={(e) => setCp(e.target.value)} onBlur={guardarContacto} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-bold text-tinta">Barrio <span className="font-normal text-slate-400">(opcional)</span></label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                  placeholder="Ej: Nueva Córdoba" value={barrio}
                  onChange={(e) => setBarrio(e.target.value)} onBlur={guardarContacto} />
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-bold text-tinta">Referencias para la entrega <span className="font-normal text-slate-400">(opcional)</span></label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
                  placeholder="Ej: portón negro, tocar timbre depto B" value={referencias}
                  onChange={(e) => setReferencias(e.target.value)} onBlur={guardarContacto} />
              </div>
              {avisoZona && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[13px] font-medium text-amber-800">{avisoZona}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Paso 2 · ¿Cómo lo pagás? */}
      <div className="mt-7 flex items-center gap-2.5">
        <span className="paso">2</span>
        <h2 className="text-lg font-bold">¿Cómo lo pagás?</h2>
      </div>
      <div className="mt-3 space-y-2.5">
        {/* v2.3: la transferencia es una opción de primer nivel (antes el
            alias quedaba escondido detrás de un link chico). */}
        <button
          className={`opcion ${pago === 'transferencia' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setPago('transferencia')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'transferencia'} />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                🏦 Transferencia bancaria — {formatoPeso(t.contado)}
                <span className="rounded-full bg-[#f2c94c] px-2 py-0.5 text-[11px] font-extrabold text-[#1c2430]">
                  15% OFF
                </span>
              </span>
              <span className="block text-[13px] text-slate-500">
                Al alias <b>pill.ar</b> · subís tu comprobante acá mismo y listo.
              </span>
            </span>
          </span>
        </button>
        <button
          className={`opcion ${pago === 'mp' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setPago('mp')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'mp'} />
            <span>
              <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                Mercado Pago de contado — {formatoPeso(t.contado)}
                <span className="rounded-full bg-[#f2c94c] px-2 py-0.5 text-[11px] font-extrabold text-[#1c2430]">
                  15% OFF
                </span>
              </span>
              <span className="block text-[13px] text-slate-500">
                Un pago con dinero en cuenta o tarjeta de débito.
              </span>
            </span>
          </span>
        </button>
        <button
          className={`opcion ${pago === 'cuotas' ? 'border-[#3d8ee7] bg-[#f2f8ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
          onClick={() => setPago('cuotas')}
        >
          <span className="flex items-start gap-3">
            <Radio activo={pago === 'cuotas'} />
            <span>
              <span className="block text-[15px] font-bold">
                3 cuotas sin interés de {formatoPeso(t.cuota)}
              </span>
              <span className="block text-[13px] text-slate-500">
                Con tarjeta de crédito, en 3 pagos iguales (Mercado Pago).
              </span>
            </span>
          </span>
        </button>
      </div>

      {/* Paso 3 · Datos de contacto (v2.2): celular siempre; dirección solo
          con envío a domicilio. Van a Malvinas al salir del campo. */}
      <div className="mt-7 flex items-center gap-2.5">
        <span className="paso">3</span>
        <h2 className="text-lg font-bold">Tus datos para coordinar</h2>
      </div>
      <div className="mt-3 space-y-2.5">
        <input
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-[15px] focus:border-[#3d8ee7] focus:outline-none"
          inputMode="tel"
          placeholder="📱 Tu celular (con código de área, ej. 351 555 0000)"
          value={celular}
          onChange={(e) => setCelular(e.target.value)}
          onBlur={guardarContacto}
        />
        <p className="text-[12px] text-slate-400">
          {recibe === 'retiro'
            ? 'Usamos tu celular para avisarte en qué farmacia retirás tu pedido.'
            : 'Usamos tu celular para coordinar la entrega en la dirección que pusiste arriba.'}
        </p>
      </div>

      {/* Resumen */}
      <div className="mt-6 rounded-xl bg-[#f1f5fa] p-5">
        <p className="text-[15px] text-slate-600">
          Tratamiento personalizado: {formatoPeso(payload.li)}
        </p>
        {pago !== 'cuotas' && (
          <p className="mt-1 text-[15px] font-bold text-green-700">
            Descuento pagando de contado (15%): −{formatoPeso(payload.li - payload.tr)}
          </p>
        )}
        <p className="mt-1 text-[15px] text-slate-600">
          {recibe === 'retiro'
            ? 'Retiro en farmacia: sin cargo'
            : envioElegido
              ? `Envío a domicilio (${zona === 'fuera' ? 'resto de la provincia' : 'Córdoba capital'}): ${formatoPeso(t.envio)}`
              : 'Envío a domicilio: elegí tu zona'}
        </p>
        <p className="mt-2 font-sans text-3xl font-bold text-tinta">
          Total: {formatoPeso(pago === 'cuotas' ? t.cuotas : t.contado)}
        </p>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {pago === 'transferencia'
            ? 'Transferencia bancaria al alias pill.ar'
            : pago === 'mp'
              ? 'Un pago con Mercado Pago (dinero en cuenta o débito)'
              : `3 cuotas sin interés de ${formatoPeso(t.cuota)} con tarjeta de crédito`}
        </p>
      </div>

      {/* Pagar (v2.3): transferencia con alias A LA VISTA + comprobante acá
          mismo; Mercado Pago con su botón para las otras dos opciones. */}
      <div className="mt-5 space-y-3">
        {pago === 'transferencia' ? (
          comprobanteListo ? (
            <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5 text-center">
              <p className="text-3xl">✅</p>
              <p className="mt-1 font-sans text-2xl font-bold text-tinta">¡Recibimos tu comprobante!</p>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-600">
                Quedó guardado junto a tu pedido. Lo verificamos y te confirmamos por WhatsApp —
                ahí mismo arranca la elaboración de tu tratamiento. 💊
              </p>
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('¡Hola! Recién subí el comprobante de mi transferencia en el checkout 🏦')}`}
                  className="mt-3 inline-block text-[14px] font-semibold text-[#2f6fbd] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📲 Avisarnos por WhatsApp (opcional)
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-2.5 rounded-xl border-2 border-[#3d8ee7]/40 bg-white p-4">
              <p className="text-[14px] text-slate-600">
                <b className="text-tinta">1.</b> Transferí <b className="text-tinta">{formatoPeso(t.contado)}</b> al alias:
              </p>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-3">
                <div>
                  <p className="font-archivo text-2xl font-extrabold tracking-tight text-navy">{ALIAS}</p>
                  <p className="text-xs text-slate-500">{TITULAR}</p>
                </div>
                <button
                  className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                  onClick={() => copiar(ALIAS, 'alias')}
                >
                  {copiado === 'alias' ? '✓ Copiado' : 'Copiar alias'}
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-[#f1f5fa] p-3">
                <p className="text-lg font-extrabold">{formatoPeso(t.contado)}</p>
                <button
                  className="rounded-lg bg-navy px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                  onClick={() => copiar(String(t.contado), 'monto')}
                >
                  {copiado === 'monto' ? '✓ Copiado' : 'Copiar monto'}
                </button>
              </div>
              <p className="pt-1 text-[14px] text-slate-600">
                <b className="text-tinta">2.</b> Subí tu comprobante (foto o PDF) y listo:
              </p>
              <label className={`block cursor-pointer rounded-xl border-2 border-dashed p-4 text-center text-[14px] transition-colors ${archivo ? 'border-green-400 bg-green-50 text-green-800' : 'border-slate-300 text-slate-500 hover:border-[#3d8ee7]'}`}>
                {archivo ? `📎 ${archivo.name}` : '📎 Tocá acá para elegir el comprobante'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    setArchivo(e.target.files?.[0] ?? null);
                    setErrorComprobante('');
                    e.target.value = '';
                  }}
                />
              </label>
              <button
                className="btn-mp disabled:opacity-60"
                disabled={!archivo || subiendo || !contactoOk || !envioElegido}
                onClick={enviarComprobante}
              >
                {subiendo ? 'Enviando…' : '📤 Enviar comprobante y confirmar pedido'}
              </button>
              {!envioElegido ? (
                <p className="text-center text-xs font-medium text-amber-700">Elegí la zona de envío para continuar.</p>
              ) : !contactoOk ? (
                <p className="text-center text-xs font-medium text-amber-700">
                  {celularOk ? 'Completá localidad, calle y código postal del envío para continuar.' : 'Completá tu celular (paso 3) para continuar.'}
                </p>
              ) : !archivo ? (
                <p className="text-center text-xs text-slate-400">¿Todavía no transferiste? Copiá el alias y hacelo desde tu banco o billetera.</p>
              ) : null}
              {errorComprobante && <p className="text-center text-sm font-medium text-red-600">{errorComprobante}</p>}
            </div>
          )
        ) : (
          <>
            <button className="btn-mp disabled:opacity-60" disabled={cargando || !envioElegido || !contactoOk} onClick={pagarConMP}>
              {cargando ? 'Preparando el pago…' : 'Ir a pagar con Mercado Pago →'}
            </button>
            {!envioElegido ? (
              <p className="text-center text-xs font-medium text-amber-700">Elegí la zona de envío para continuar.</p>
            ) : !contactoOk ? (
              <p className="text-center text-xs font-medium text-amber-700">
                {celularOk ? 'Completá localidad, calle y código postal del envío para continuar.' : 'Completá tu celular para continuar.'}
              </p>
            ) : null}
            {error && <p className="text-center text-sm font-medium text-red-600">{error}</p>}
          </>
        )}
      </div>

      <p className="mt-5 text-center text-[12px] leading-relaxed text-slate-400">
        {pago === 'transferencia'
          ? 'Verificamos cada transferencia antes de confirmar el pedido. '
          : 'Pago procesado por Mercado Pago. '}
        Al pagar aceptás los{' '}
        <a
          href="https://pill.ar/es/terminos-y-condiciones"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          Términos y Condiciones y la Política de Privacidad
        </a>{' '}
        de PILL.AR.
      </p>
    </div>
  );
}
