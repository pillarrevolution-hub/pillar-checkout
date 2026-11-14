// Validación de celular argentino: el resultado tiene que ser EXACTAMENTE
// 10 dígitos (código de área + número, sin 0, sin 15, sin 54/9 de
// discado internacional). Acepta cualquier formato de entrada: con
// espacios, guiones, "+54 9 …", "0…15…", o ya los 10 dígitos limpios.
export type ResultadoCelular = { ok: boolean; normalizado: string };

export function validarCelular(valor: string): ResultadoCelular {
  const tokens = valor.split(/\D+/).filter(Boolean);
  // El "15" (prefijo de celular al discar en el país, "0351-15-xxxxxxx")
  // viaja siempre como token separado del código de área — se descarta,
  // salvo que sea el primer token (ahí no es un prefijo, es el número).
  let d = tokens.filter((tok, i) => !(tok === '15' && i > 0)).join('');
  if (d.startsWith('54')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  else if (d.startsWith('9')) d = d.slice(1);
  const ok = /^\d{10}$/.test(d);
  return { ok, normalizado: ok ? d : '' };
}

// "3512501234" -> "351 250-1234", solo para mostrar en pantalla.
export function formatoCelular(normalizado: string): string {
  if (!/^\d{10}$/.test(normalizado)) return normalizado;
  return `${normalizado.slice(0, 3)} ${normalizado.slice(3, 6)}-${normalizado.slice(6)}`;
}

export const CELULAR_ERROR = 'Escribí tu celular con código de área, sin el 0 ni el 15 (10 dígitos)';
