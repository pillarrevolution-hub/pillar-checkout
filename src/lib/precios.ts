// Derivación de precios del checkout a partir del precio de contado —
// una sola fuente, usada en la Home y en la pantalla de pago (Paso4).

// El "15%" tiene que ser SIEMPRE cierto (pedido de Tomi): la lista se
// deriva del contado, nunca al revés.
export function listaDesdeContado(contado: number): number {
  return Math.round(contado / 0.85);
}

export function cuotaDeLista(lista: number): number {
  return Math.round(lista / 3);
}
