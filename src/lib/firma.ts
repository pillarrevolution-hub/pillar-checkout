import { createHmac, timingSafeEqual } from 'crypto';

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
  li: number; // precio de lista (3 cuotas), SIN envío
  ec: number; // envío a domicilio en Córdoba capital ($)
  el: number; // envío a domicilio fuera de Córdoba ($)
  d?: string; // fecha estimada de entrega (YYYY-MM-DD), opcional
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
    if (
      p?.v !== 1 ||
      !Number.isFinite(p.o) ||
      !Number.isFinite(p.tr) ||
      !Number.isFinite(p.li) ||
      !Number.isFinite(p.ec) ||
      !Number.isFinite(p.el)
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

// ---------------- Envío y totales (una sola fuente de verdad) ----------------

export type OpcionEnvio = 'colegio' | 'cordoba' | 'fuera';
export type TipoPago = 'transferencia' | 'contado' | 'cuotas';

export function montoEnvio(p: PayloadCheckout, envio: OpcionEnvio): number {
  return envio === 'cordoba' ? p.ec : envio === 'fuera' ? p.el : 0;
}

// contado (transferencia o MP un pago) parte del precio tr; cuotas del li.
export function total(p: PayloadCheckout, envio: OpcionEnvio, tipo: TipoPago): number {
  const base = tipo === 'cuotas' ? p.li : p.tr;
  return Math.round(base + montoEnvio(p, envio));
}

export function formatoPeso(v: number): string {
  return '$' + Math.round(v).toLocaleString('es-AR');
}
