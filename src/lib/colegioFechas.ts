// Calendario de presentación del Colegio de Farmacéuticos de Córdoba.
// Actualizar cada trimestre. TODO: pasar a ⚙️ Cotizador de Malvinas (checkout-data).
export const FECHAS_REPARTO_COLEGIO: readonly string[] = [
  '2026-09-28',
  '2026-10-13',
  '2026-10-27',
  '2026-11-11',
  '2026-11-25',
  '2026-12-10',
  '2026-12-28',
];

export const DIAS_MINIMOS_PRODUCCION = 5;

const ZONA_CORDOBA = 'America/Argentina/Cordoba';
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Convierte un instante a su fecha CIVIL en Córdoba, representada como
// medianoche UTC de ese mismo día — así se puede restar contra las fechas
// de FECHAS_REPARTO_COLEGIO (también medianoche UTC) sin que un huso
// horario corra el día.
function fechaCivilUTC(instante: Date): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CORDOBA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(instante)
    .split('-')
    .map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// Primera fecha del calendario CFC tal que fecha − hoy ≥ minDias días
// calendario (comparando fechas civiles en Córdoba, sin hora). `hoy` debe
// venir del server (nunca del reloj del navegador). null si ninguna
// fecha del calendario deja suficiente margen de producción.
export function proximoRepartoColegio(
  hoy: Date,
  fechas: readonly string[] = FECHAS_REPARTO_COLEGIO,
  minDias: number = DIAS_MINIMOS_PRODUCCION
): Date | null {
  const hoyCivil = fechaCivilUTC(hoy);
  for (const f of fechas) {
    const fecha = new Date(`${f}T00:00:00Z`);
    const diffDias = Math.round((fecha.getTime() - hoyCivil.getTime()) / MS_POR_DIA);
    if (diffDias >= minDias) return fecha;
  }
  return null;
}

// "martes 13 de octubre" — día de la semana + día + mes, en minúsculas.
export function fechaRepartoTexto(d: Date): string {
  const diaSemana = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: 'long' }).format(d);
  const diaMes = new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long' }).format(d);
  return `${diaSemana} ${diaMes}`.toLowerCase();
}

// "Hoy" para el calendario del Colegio: siempre el reloj del server,
// salvo el override `?hoy=2026-09-23` para probar — y ese override SOLO
// funciona fuera de producción, nunca en el sitio real.
export function resolverHoy(hoyQueryParam: string | undefined): Date {
  const esProduccion = process.env.VERCEL_ENV === 'production';
  if (!esProduccion && hoyQueryParam && /^\d{4}-\d{2}-\d{2}$/.test(hoyQueryParam)) {
    const d = new Date(`${hoyQueryParam}T12:00:00-03:00`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
