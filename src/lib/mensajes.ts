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

export type ReciboElegido =
  | { modo: 'red'; sucursal: string }
  | { modo: 'colegio'; localidad: string }
  | { modo: 'envio'; direccion: string };

export function descripcionRecibo(r: ReciboElegido): string {
  if (r.modo === 'red') return `retiro en Farmacia RED ${r.sucursal}`;
  if (r.modo === 'colegio') return `retiro en una farmacia de ${r.localidad} (Colegio)`;
  return `envío a ${r.direccion}`;
}
