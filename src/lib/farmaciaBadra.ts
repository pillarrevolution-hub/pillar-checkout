// Nueva Farmacia Badra — retiro en Córdoba capital (v3.3, retiroModo='badra').
// Un solo local fijo (no hay sucursal a elegir, a diferencia de Farmacias RED):
// el Paso 2 muestra esta tarjeta siempre igual. `retiroLugar` es el texto EXACTO
// que Malvinas ya acepta en producción (PR #41, 21-oct) — no cambiarlo.
export const RETIRO_LUGAR_BADRA = 'Nueva Farmacia Badra, Félix Paz 585';

export const FARMACIA_BADRA = {
  nombre: 'Nueva Farmacia Badra',
  direccion: 'Félix Paz 585, Córdoba capital',
  horario: 'Lunes a viernes de 9 a 16 hs',
  mapsQuery: 'Félix Paz 585, Córdoba',
} as const;
