// Rate-limit en memoria, por IP — protección para las rutas de Google
// Places (v3.2, tema 2/3). Places API New no tiene tope diario
// configurable (verificado en la consola de Google: "Ajustable: No",
// 175.000 autocompletes/día de fábrica), así que esto es lo único que
// impide que un bucle o un bot nos vacíe la cuota. En memoria alcanza:
// cada instancia serverless arranca fría igual, y lo que importa es
// frenar ráfagas dentro de la MISMA instancia/minuto.
const VENTANA_MS = 60_000;
const LIMITE = 30;

const ventanas = new Map<string, { conteo: number; reseteaEn: number }>();

export function permitir(ip: string): boolean {
  const ahora = Date.now();

  // Poda oportunista: evita que el Map crezca sin límite si pega mucho
  // tráfico de IPs distintas dentro de la misma instancia.
  if (ventanas.size > 5000) {
    ventanas.forEach((v, clave) => {
      if (ahora > v.reseteaEn) ventanas.delete(clave);
    });
  }

  const actual = ventanas.get(ip);
  if (!actual || ahora > actual.reseteaEn) {
    ventanas.set(ip, { conteo: 1, reseteaEn: ahora + VENTANA_MS });
    return true;
  }
  if (actual.conteo >= LIMITE) return false;
  actual.conteo++;
  return true;
}

export function ipDeRequest(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconocida';
}
