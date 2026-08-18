import type { PayloadCheckout } from './firma';

// Datos VIVOS de la cotización para el link corto /c/{id}/{t}: se piden a
// Malvinas (checkout-data) con la firma como credencial. Si el precio se
// editó después de mandar el link, acá llega el vigente; y si ya está
// paga, viene marcado y el checkout no deja pagar de nuevo.
export type DatosCheckout = PayloadCheckout & { pagada?: boolean; comprobanteRecibido?: boolean };

export async function obtenerDatos(id: string | number, t: string): Promise<DatosCheckout | null> {
  const base = (process.env.MALVINAS_URL ?? '').replace(/\/$/, '');
  // Firma corta de 12 hex (v2.3.1, "el link sigue largo") o la vieja de 32
  // — Malvinas valida las dos, los links ya mandados siguen andando.
  if (!base || !/^\d+$/.test(String(id)) || !/^([0-9a-f]{12}|[0-9a-f]{32})$/.test(t)) return null;
  try {
    const res = await fetch(`${base}/api/cotizaciones/${id}/checkout-data?t=${t}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const d = (await res.json()) as DatosCheckout;
    if (d?.v !== 1 || !Number.isFinite(d.tr) || !Number.isFinite(d.li)) return null;
    return d;
  } catch {
    return null;
  }
}

// Número de WhatsApp de la farmacia (solo dígitos con código de país, ej
// 549351…). Si no está cargado, los botones de WhatsApp no se muestran.
export function whatsappNumero(): string | null {
  const n = (process.env.WHATSAPP_NUMERO ?? '').replace(/[^\d]/g, '');
  return n.length >= 8 ? n : null;
}

export function linkWhatsApp(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}
