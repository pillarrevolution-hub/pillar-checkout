// ---------------------------------------------------------------
// Envío a domicilio validado con Google Places (v3.2, tema 2/3):
// funciones puras, sin fetch ni nada de red — las usan tanto los route
// handlers (server) como el combobox (cliente), y son las que se
// prueban con node:test. Todo lo que habla con Google vive en
// src/app/api/direcciones/*.
// ---------------------------------------------------------------

// Extensión .ts explícita (permitida por allowImportingTsExtensions en
// tsconfig): así el test de este archivo puede importarse directo con
// `node --test`, sin bundler de por medio — igual que ../envios.ts en
// envios.test.ts.
import { normalizarLocalidad } from './envios.ts';

// Compara localidades tolerando mayúsculas/tildes/espacios (ya lo hace
// normalizarLocalidad) y además el prefijo "Ciudad de " — "Ciudad de
// Córdoba" tiene que matchear "Córdoba" sin que dependa de la lista de
// sinónimos de envios.ts (esa es para lo que el paciente TIPEA; esto es
// para comparar contra lo que devuelve Google).
export function normalizarParaComparar(s: string | null | undefined): string {
  return normalizarLocalidad(s).replace(/^ciudad de /, '');
}

export function localidadesCoinciden(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarParaComparar(a);
  const nb = normalizarParaComparar(b);
  return na !== '' && na === nb;
}

// Compara dos textos de dirección (lo tipeado por el paciente vs. el
// "principal" de la primera sugerencia) tolerando mayúsculas, tildes,
// puntuación y espacios — misma normalización que las localidades, que
// para esto también sirve (colapsa todo a minúsculas + alfanumérico).
export function coincideAproximado(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizarLocalidad(a);
  const nb = normalizarLocalidad(b);
  return na !== '' && na === nb;
}

// Input para POST places:autocomplete: "<texto>, <localidad>,
// <provincia?>, Argentina". Si el tarifario no trae provincia para esa
// localidad, no se inventa — se arma sin esa parte (ver pedido de Tomi:
// hay 16 localidades de Buenos Aires, las de Pergamino, en el mismo
// tarifario que las de Córdoba).
export function armarInputAutocomplete(texto: string, localidad: string, provincia?: string | null): string {
  return [texto.trim(), localidad.trim(), provincia?.trim() || '', 'Argentina'].filter(Boolean).join(', ');
}

export type GoogleAddressComponent = { longText?: string; shortText?: string; types?: string[] };

// Lee los addressComponents de GET places/{placeId} (Essentials:
// id,formattedAddress,addressComponents,location — no agregar campos de
// otro tramo). localidadGoogle cae en cascada: locality → sublocality →
// administrative_area_level_2, para no perder localidades que Google no
// modela como "locality" (pedanías, parajes).
export function leerDireccionGoogle(componentes: GoogleAddressComponent[]): {
  calle: string;
  altura: string;
  localidadGoogle: string;
  provinciaGoogle: string;
  codigoPostal: string;
} {
  const porTipo = (tipo: string) => componentes.find((c) => c.types?.includes(tipo));
  return {
    calle: porTipo('route')?.longText ?? '',
    altura: porTipo('street_number')?.longText ?? '',
    localidadGoogle:
      porTipo('locality')?.longText ?? porTipo('sublocality')?.longText ?? porTipo('administrative_area_level_2')?.longText ?? '',
    provinciaGoogle: porTipo('administrative_area_level_1')?.longText ?? '',
    // B3 (16-nov): el código postal ya no se valida a mano — si Google lo
    // trae, se usa; si no, el campo queda editable (ver domicilio.ts).
    codigoPostal: porTipo('postal_code')?.longText ?? '',
  };
}
