// ---------------------------------------------------------------
// Envío por localidad (v3) — mismos helpers que src/lib/envios.ts de
// Malvinas (tienen que dar EXACTAMENTE lo mismo: el checkout solo busca
// en el tarifario que ya llega resuelto en `checkout-data.envios.tarifas`,
// nunca calcula precios). Adaptado a la forma corta de la fila
// ({ l, p, m, t }) en vez de la fila completa de la tabla.
// ---------------------------------------------------------------

export type TarifaEnvio = {
  l: string; // localidad (como está en el tarifario, MAYÚSCULAS)
  p: string; // provincia
  m: number; // monto que paga el paciente (lista + recargo, ya resuelto)
  t: string | null; // demora ("48 hs" / "5 días" / "sale martes y jueves"), null = no se muestra
};

export function normalizarLocalidad(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SINONIMOS: string[][] = [
  ['cordoba', 'cordoba capital', 'cba', 'cordoba cba', 'ciudad de cordoba'],
  ['carlos paz', 'villa carlos paz'],
  ['caba', 'capital federal', 'buenos aires', 'ciudad autonoma de buenos aires'],
];

function equivalentes(norm: string): string[] {
  const grupo = SINONIMOS.find((g) => g.includes(norm));
  return grupo ? grupo.filter((x) => x !== norm) : [];
}

// Tarifa para lo que escribió el paciente: 1) exacta normalizada, 2)
// sinónimos, 3) contención por tokens completos (si UNA sola matchea).
export function buscarTarifa(texto: string, tarifas: TarifaEnvio[]): TarifaEnvio | null {
  const norm = normalizarLocalidad(texto);
  if (!norm) return null;

  const exacta = tarifas.find((t) => normalizarLocalidad(t.l) === norm);
  if (exacta) return exacta;

  for (const alt of equivalentes(norm)) {
    const t = tarifas.find((x) => normalizarLocalidad(x.l) === alt);
    if (t) return t;
  }

  const tokens = norm.split(' ');
  const contienen = tarifas.filter((t) => {
    const suyos = normalizarLocalidad(t.l).split(' ');
    return tokens.every((tk) => suyos.includes(tk));
  });
  return contienen.length === 1 ? contienen[0] : null;
}

// Sugerencias para el autocompletar: primero las que EMPIEZAN con el
// texto (o un sinónimo), después las que lo CONTIENEN. Alfabético.
export function sugerirTarifas(texto: string, tarifas: TarifaEnvio[], max = 6): TarifaEnvio[] {
  const norm = normalizarLocalidad(texto);
  if (!norm) return [];
  const claves = [norm, ...equivalentes(norm)];
  const lista = [...tarifas].sort((a, b) => normalizarLocalidad(a.l).localeCompare(normalizarLocalidad(b.l)));
  const empiezan = lista.filter((t) => claves.some((c) => normalizarLocalidad(t.l).startsWith(c)));
  const contienen = lista.filter((t) => !empiezan.includes(t) && claves.some((c) => normalizarLocalidad(t.l).includes(c)));
  return [...empiezan, ...contienen].slice(0, Math.max(0, max));
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

// Título prolijo para mostrar ("ALTA GRACIA" → "Alta Gracia"); el valor
// que viaja a Malvinas sigue siendo el original en MAYÚSCULAS.
export function tituloLocalidad(s: string): string {
  return s
    .toLocaleLowerCase('es-AR')
    .split(' ')
    .map((w) => (w.length ? w[0].toLocaleUpperCase('es-AR') + w.slice(1) : w))
    .join(' ');
}
