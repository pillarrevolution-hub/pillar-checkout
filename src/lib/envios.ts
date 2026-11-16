// ---------------------------------------------------------------
// Envío a domicilio (B1, 16-nov): dos tarifas planas según provincia —
// YA NO se busca ninguna localidad en un tarifario. `tarifaEnvio()` es
// la única fuente de verdad del monto, acá y en el server
// (api/preferencia/route.ts) — nunca se vuelve a calcular en dos
// lugares. Sin plazo de entrega (pedido de Tomi, B1): PLAZO_ENVIO_* están
// en null a propósito, los define el desarrollador si algún día se
// quiere volver a mostrar uno.
//
// `TarifaEnvio` queda como tipo DEPRECADO: el campo `envios.tarifas` de
// `checkout-data` lo sigue mandando Malvinas (no se le pidió sacarlo) y
// el stub de Playwright lo sigue devolviendo para probar que el checkout
// lo ignora — pero ningún código de acá lo lee más.
// ---------------------------------------------------------------

export type TarifaEnvio = {
  l: string; // localidad (como está en el tarifario viejo, MAYÚSCULAS)
  p: string; // provincia
  m: number; // monto que paga el paciente (lista + recargo, ya resuelto)
  t: string | null; // demora ("48 hs" / "5 días" / "sale martes y jueves"), null = no se muestra
};

export const TARIFA_CORDOBA = 15000;
export const TARIFA_RESTO = 17000;

// Plazo de entrega a mostrar — null = no se renderiza ninguna línea de
// demora (decisión de B1: "no se muestra ningún plazo de entrega"). Los
// define el desarrollador si hace falta reactivarlos.
export const PLAZO_ENVIO_CORDOBA: string | null = null;
export const PLAZO_ENVIO_RESTO: string | null = null;

// Única regla de precio de envío a domicilio: Córdoba (la provincia,
// cualquier localidad) paga TARIFA_CORDOBA, el resto del país
// TARIFA_RESTO. Sin provincia (todavía no la mandó Google ni el
// paciente) no hay tarifa que mostrar: null.
export function tarifaEnvio(provincia: string | null | undefined): number | null {
  const norm = normalizarLocalidad(provincia);
  if (!norm) return null;
  return norm === 'cordoba' ? TARIFA_CORDOBA : TARIFA_RESTO;
}

export function normalizarLocalidad(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Localidad EXACTA (normalizada, sin tildes/mayúsculas) de la lista de
// ~497 localidades de Córdoba que manda Malvinas — para el retiro por
// Colegio de Farmacéuticos, que solo llega a Córdoba. Devuelve el nombre
// OFICIAL tal como está en la lista (con su casing propio).
export function matchExactoLocalidad(texto: string, localidades: readonly string[]): string | null {
  const norm = normalizarLocalidad(texto);
  if (!norm) return null;
  return localidades.find((l) => normalizarLocalidad(l) === norm) ?? null;
}

// Sugerencias para el autocompletar de localidades de Córdoba: primero
// las que EMPIEZAN con el texto, después las que lo CONTIENEN. Alfabético.
export function sugerirLocalidades(texto: string, localidades: readonly string[], max = 6): string[] {
  const norm = normalizarLocalidad(texto);
  if (!norm) return [];
  const lista = [...localidades].sort((a, b) => normalizarLocalidad(a).localeCompare(normalizarLocalidad(b)));
  const empiezan = lista.filter((l) => normalizarLocalidad(l).startsWith(norm));
  const contienen = lista.filter((l) => !empiezan.includes(l) && normalizarLocalidad(l).includes(norm));
  return [...empiezan, ...contienen].slice(0, Math.max(0, max));
}

// Si lo que escribió el paciente deja UNA sola localidad candidata (sin
// ser todavía el nombre oficial exacto), la devuelve para auto-aceptarla
// — mismo criterio que el match exacto, pero para el caso de una
// sugerencia difusa sin ambigüedad (p. ej. "Rio Cuarto" sin tilde). Si hay
// 0 candidatas (nada que sugerir) o 2+ (ambiguo), null: ahí el paciente
// tiene que elegir de la lista.
export function matchUnicoDifuso(texto: string, localidades: readonly string[]): string | null {
  if (normalizarLocalidad(texto).length < 3) return null;
  const sugeridas = sugerirLocalidades(texto, localidades, 6);
  return sugeridas.length === 1 ? sugeridas[0] : null;
}

// Título prolijo para mostrar ("ALTA GRACIA" → "Alta Gracia"); el valor
// que viaja a Malvinas sigue siendo el original en MAYÚSCULAS.
export function tituloLocalidad(s: string): string {
  return s
    .toLocaleLowerCase('es-AR')
    .split(' ')
    .map((w) => (w.length ? w[0].toLocaleUpperCase('es-AR') + w.slice(1) : w))
    .join(' ');
}
