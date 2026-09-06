import { createHmac, timingSafeEqual } from 'crypto';
import type { TarifaEnvio } from './envios';

// ---------------------------------------------------------------
// Link firmado del checkout PILL.AR.
//
// Malvinas genera el link con el MISMO secreto (CHECKOUT_SECRET en los
// dos proyectos): payload JSON → base64url → t = HMAC-SHA256 (32 hex).
// Acá solo se VERIFICA: si la firma no coincide, el link no vale — nadie
// puede fabricar o retocar un precio.
// ---------------------------------------------------------------

export type PayloadCheckout = {
  v: 1;
  o: number; // nº de cotización en Malvinas
  n: string; // nombre del paciente (para saludar)
  tr: number; // precio transferencia / contado, SIN envío
  li: number; // precio de lista informado por Malvinas — NO USAR: ver listaDerivada()
  // DEPRECADOS (v3): precios fijos de envío corto/largo. Los links viejos
  // (?p=) siguen trayéndolos; lo nuevo es `envios`.
  ec?: number;
  el?: number;
  // Tarifario por localidad (checkout-data, links cortos /c/{id}/{t}).
  // Ausente en los links viejos: ahí "Me lo mandan a casa" va deshabilitado.
  envios?: { recargo: number; leyenda: string; tarifas: TarifaEnvio[] };
  // Localidades de Córdoba para el autocompletar del retiro por Colegio.
  localidades?: readonly string[];
  // Cotización anterior al tarifario, con el envío YA incluido en el
  // precio: el checkout no vuelve a cobrarlo (envío siempre $0).
  envioAdentro?: boolean;
};

export function firmar(p64: string, secreto: string): string {
  return createHmac('sha256', secreto).update(p64).digest('hex').slice(0, 32);
}

export function verificarLink(p64: string | undefined, t: string | undefined): PayloadCheckout | null {
  const secreto = process.env.CHECKOUT_SECRET;
  if (!secreto || !p64 || !t) return null;
  const esperada = firmar(p64, secreto);
  const a = Buffer.from(esperada);
  const b = Buffer.from(String(t));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(p64, 'base64url').toString('utf8');
    const p = JSON.parse(json) as PayloadCheckout;
    if (p?.v !== 1 || !Number.isFinite(p.o) || !Number.isFinite(p.tr) || !Number.isFinite(p.li)) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

// ---------------- Envío y totales (una sola fuente de verdad) ----------------

export type TipoPago = 'contado' | 'cuotas';

// Elección de envío YA RESUELTA (la localidad ya se buscó en el
// tarifario, o el paciente eligió retiro): monto final en pesos, 0 si
// retira o si el envío ya está incluido en el precio (envioAdentro).
export type EleccionEnvio = { modo: 'retiro' } | { modo: 'envio'; monto: number };

export function montoEnvio(eleccion: EleccionEnvio): number {
  return eleccion.modo === 'envio' ? eleccion.monto : 0;
}

// El "15%" tiene que ser SIEMPRE cierto (pedido de Tomi): la lista se
// deriva del precio de contado, nunca se usa el `li` que manda Malvinas
// (queda en el payload solo para loguear si difiere mucho).
export function listaDerivada(p: Pick<PayloadCheckout, 'tr'>): number {
  return Math.round(p.tr / 0.85);
}

// contado (transferencia o MP un pago) parte del precio tr; cuotas de la
// lista derivada.
export function total(p: Pick<PayloadCheckout, 'tr'>, eleccion: EleccionEnvio, tipo: TipoPago): number {
  const base = tipo === 'cuotas' ? listaDerivada(p) : p.tr;
  return Math.round(base + montoEnvio(eleccion));
}

export function formatoPeso(v: number): string {
  return '$' + Math.round(v).toLocaleString('es-AR');
}
