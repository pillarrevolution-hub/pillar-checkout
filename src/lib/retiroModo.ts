// Un retiroModo desconocido NUNCA frena un pago: `/api/contacto` y
// `/api/preferencia` lo ignoran (vuelve '') en vez de rechazar el request.
// Esta función pura centraliza esa regla para que las dos rutas (y los tests)
// usen exactamente el mismo criterio.
export type RetiroModo = 'red' | 'colegio' | 'badra' | '';

export function normalizarRetiroModo(v: unknown): RetiroModo {
  return v === 'red' || v === 'colegio' || v === 'badra' ? v : '';
}
