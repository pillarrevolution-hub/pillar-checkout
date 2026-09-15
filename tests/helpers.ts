import { createHmac } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Los tests corren con Node puro (no con Next), así que .env.local no se
// carga solo: se parsea a mano acá, la misma cuenta que hace Malvinas al
// firmar el link corto (ver src/lib/checkoutFirma.ts).
function cargarEnvLocal(): Record<string, string> {
  const ruta = join(__dirname, '..', '.env.local');
  if (!existsSync(ruta)) return {};
  const texto = readFileSync(ruta, 'utf8');
  const env: Record<string, string> = {};
  for (const linea of texto.split('\n')) {
    const i = linea.indexOf('=');
    if (i === -1) continue;
    env[linea.slice(0, i).trim()] = linea.slice(i + 1).trim();
  }
  return env;
}

const env = cargarEnvLocal();

// Cotización de prueba: paciente "ZZZ PRUEBA CLAUDE BORRAR" (DNI
// 00000000). Se puede pisar con CHECKOUT_TEST_COTIZACION si hiciera
// falta apuntar a otra.
export const COTIZACION_TEST = Number(process.env.CHECKOUT_TEST_COTIZACION ?? 164);

export function linkCheckoutTest(cotizacion: number = COTIZACION_TEST): string {
  const secreto = env.CHECKOUT_SECRET ?? process.env.CHECKOUT_SECRET;
  if (!secreto) {
    throw new Error('Falta CHECKOUT_SECRET en .env.local — necesario para firmar el link de test.');
  }
  const firma = createHmac('sha256', secreto).update(`c|${cotizacion}`).digest('hex').slice(0, 12);
  return `/c/${cotizacion}/${firma}`;
}
