import { FARMACIA_BADRA, RETIRO_LUGAR_BADRA } from './farmaciaBadra.ts';
import { formatoPeso } from './firma.ts';

// Mensaje de WhatsApp YA ESCRITO para la confirmación (paso 5 en el
// checkout — transferencia recién subida — y /gracias al volver de
// Mercado Pago): mismo formato en los dos lugares para que Tomi pueda
// corroborar el pago leyendo el mensaje que le llega.
export function mensajeConfirmacion(args: {
  nombre: string;
  o: number;
  accion: string; // "transferir $X al alias pill.ar y subí el comprobante" | "pagar $X por Mercado Pago (3 cuotas)"
  recibo: string; // "retiro en Farmacia RED Cerro" | "retiro en una farmacia de Alta Gracia (Colegio)" | "envío a Av. Belgrano 1234, Alta Gracia"
  celular: string;
}): string {
  return `Hola! Soy ${args.nombre}, cotización #${args.o}. Acabo de ${args.accion}. Lo recibo: ${args.recibo}. Mi celular: ${args.celular}.`;
}

// Mensaje de WhatsApp del comprobante de transferencia (C4) — mismo
// texto en Paso4Pagar.tsx y en /gracias (C5, botón "Abrir WhatsApp" por
// si el paciente cerró la pestaña sin mandarlo).
export function mensajeComprobanteTransferencia(args: { nombre: string; monto: number; cotizacion: number }): string {
  return `Hola, soy ${args.nombre}. Realicé la transferencia de ${formatoPeso(args.monto)} por mi tratamiento, cotización #${args.cotizacion}. Adjunto el comprobante.`;
}

export type ReciboElegido =
  | { modo: 'red'; sucursal: string }
  | { modo: 'colegio'; localidad: string; fecha?: string }
  | { modo: 'badra' }
  | { modo: 'envio'; direccion: string };

export function descripcionRecibo(r: ReciboElegido): string {
  if (r.modo === 'red') return `retiro en Farmacia RED ${r.sucursal}`;
  if (r.modo === 'colegio') {
    return `retiro en una farmacia de ${r.localidad} (Colegio${r.fecha ? `, llega el ${r.fecha}` : ''})`;
  }
  if (r.modo === 'badra') {
    return `retiro en ${RETIRO_LUGAR_BADRA} (${FARMACIA_BADRA.horario.toLowerCase()})`;
  }
  return `envío a ${r.direccion}`;
}

// Versión para la caja "Recibís:" de la Confirmación y de /gracias —
// mismo dato que descripcionRecibo pero con "· llega el {fecha}" en vez
// de "(Colegio, llega el {fecha})" (pedido de Tomi: formato distinto para
// esa caja vs. el mensaje de WhatsApp).
export function reciboMostrado(r: ReciboElegido): string {
  if (r.modo === 'colegio' && r.fecha) {
    return `retiro en una farmacia de ${r.localidad} · llega el ${r.fecha}`;
  }
  return descripcionRecibo(r);
}
