// Cliente mínimo de la API de Mercado Pago (sin SDK: dos llamadas).
// Docs: https://www.mercadopago.com.ar/developers/es/reference

const API = 'https://api.mercadopago.com';

function token(): string {
  const t = process.env.MP_ACCESS_TOKEN;
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN (cargalo en las variables de entorno de Vercel)');
  return t;
}

export function baseUrl(): string {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Checkout Pro: se crea una "preferencia" y se redirige al init_point.
export async function crearPreferencia(args: {
  cotizacion: number;
  titulo: string;
  monto: number;
  cuotas: 1 | 3;
  // Nombre corto para el external_reference (log/legacy): localidad de
  // envío, o el modo de retiro, o 'retiro'.
  envio: string;
  tipo: string;
  // v3: metadata para reconstruir el mensaje de WhatsApp de /gracias sin
  // volver a pedirle nada a Malvinas — MP la devuelve tal cual en el pago
  // (ver obtenerPago). Mercado Pago normaliza las claves a snake_case.
  metadata: {
    nombre: string;
    retiro_modo: string;
    retiro_lugar: string;
    retiro_fecha_colegio: string;
    envio_localidad: string;
    envio_monto: number;
    direccion_texto: string;
    celular: string;
  };
}): Promise<{ init_point: string }> {
  const base = baseUrl();
  const res = await fetch(`${API}/checkout/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify({
      items: [
        {
          id: `cot-${args.cotizacion}`,
          title: args.titulo,
          quantity: 1,
          unit_price: args.monto,
          currency_id: 'ARS',
        },
      ],
      // Con esto el webhook sabe QUÉ cotización se pagó y cómo.
      external_reference: `${args.cotizacion}|${args.envio}|${args.tipo}`,
      payment_methods: {
        installments: args.cuotas,
        default_installments: args.cuotas,
      },
      back_urls: {
        success: `${base}/gracias`,
        pending: `${base}/gracias?pendiente=1`,
        failure: `${base}/error-pago`,
      },
      auto_return: 'approved',
      notification_url: `${base}/api/mp/webhook`,
      statement_descriptor: 'PILLAR',
      metadata: { cotizacion: args.cotizacion, tipo: args.tipo, ...args.metadata },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.init_point) {
    throw new Error(data?.message ?? `Mercado Pago respondió ${res.status}`);
  }
  return { init_point: data.init_point };
}

export type PagoMP = {
  id: number;
  status: string; // approved | pending | rejected | …
  transaction_amount: number;
  external_reference?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  installments?: number;
  // Lo que mandamos en `metadata` al crear la preferencia — MP lo
  // normaliza a snake_case y lo devuelve tal cual en el pago.
  metadata?: Record<string, unknown>;
};

export async function obtenerPago(id: string | number): Promise<PagoMP | null> {
  const res = await fetch(`${API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as PagoMP;
}
