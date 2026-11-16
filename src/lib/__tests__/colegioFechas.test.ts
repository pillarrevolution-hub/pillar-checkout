import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  proximoRepartoColegio,
  fechaRepartoTexto,
  advertirSiCalendarioPorVencer,
  FECHAS_REPARTO_COLEGIO,
  DIAS_MINIMOS_PRODUCCION,
  DIAS_AVISO_VENCIMIENTO_CALENDARIO,
} from '../colegioFechas.ts';

// "hoy" siempre al mediodía en Córdoba (-03:00) para que la fecha civil
// del test sea inequívoca, sin importar en qué huso corra `node --test`.
function hoyCordoba(fechaIso: string): Date {
  return new Date(`${fechaIso}T12:00:00-03:00`);
}

test('18 días de margen — cae en la primera fecha del calendario', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-09-10'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-09-28');
});

test('justo 5 días (el mínimo) — todavía cuenta', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-09-23'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-09-28');
});

test('4 días — no alcanza, salta a la siguiente fecha', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-09-24'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-10-13');
});

test('justo 5 días contra la segunda fecha', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-10-08'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-10-13');
});

test('4 días contra la segunda fecha — salta a la tercera', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-10-09'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-10-27');
});

test('justo 5 días contra la última fecha del calendario', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-12-23'));
  assert.equal(r?.toISOString().slice(0, 10), '2026-12-28');
});

test('4 días contra la última fecha — sin fecha siguiente, null', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-12-24'));
  assert.equal(r, null);
});

test('después de la última fecha del calendario — null', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-12-29'));
  assert.equal(r, null);
});

// C3 (14-nov): sin fecha disponible, la caja del Paso 1 muestra "Te
// confirmamos la fecha de llegada por WhatsApp" en vez de quedar vacía o
// bloquear — fecha usada para probarlo a mano con ?hoy=2026-12-27 (fuera
// de producción) contra el checkout real.
test('sin fecha disponible (2026-12-27, 1 día de margen contra la última) — null, mismo caso usado para QA manual con ?hoy=', () => {
  const r = proximoRepartoColegio(hoyCordoba('2026-12-27'));
  assert.equal(r, null);
});

test('el mismo día de una fecha del calendario, a las 23:59 en Córdoba — no cuenta ese día', () => {
  const hoy = new Date('2026-10-13T23:59:00-03:00');
  const r = proximoRepartoColegio(hoy);
  assert.equal(r?.toISOString().slice(0, 10), '2026-10-27');
});

test('fechaRepartoTexto: día de la semana + día + mes, en minúsculas, sin coma', () => {
  assert.equal(fechaRepartoTexto(new Date('2026-10-13T00:00:00Z')), 'martes 13 de octubre');
  assert.equal(fechaRepartoTexto(new Date('2026-09-28T00:00:00Z')), 'lunes 28 de septiembre');
});

test('FECHAS_REPARTO_COLEGIO y DIAS_MINIMOS_PRODUCCION quedan como se definieron', () => {
  assert.deepEqual(FECHAS_REPARTO_COLEGIO, [
    '2026-09-28',
    '2026-10-13',
    '2026-10-27',
    '2026-11-11',
    '2026-11-25',
    '2026-12-10',
    '2026-12-28',
  ]);
  assert.equal(DIAS_MINIMOS_PRODUCCION, 5);
  assert.equal(DIAS_AVISO_VENCIMIENTO_CALENDARIO, 21);
});

// C3 (14-nov): aviso de mantenimiento en consola cuando falten ≤21 días
// para la última fecha cargada (hoy: 2026-12-28) — para que alguien
// cargue el tramo siguiente a tiempo, sin esperar a que el calendario se
// quede sin fechas.
test('advertirSiCalendarioPorVencer: a 22 días de la última fecha — todavía no avisa', (t) => {
  const warn = t.mock.method(console, 'warn');
  advertirSiCalendarioPorVencer(hoyCordoba('2026-12-06'));
  assert.equal(warn.mock.calls.length, 0);
});

test('advertirSiCalendarioPorVencer: justo a 21 días (el límite) — avisa con el texto exacto', (t) => {
  const warn = t.mock.method(console, 'warn');
  advertirSiCalendarioPorVencer(hoyCordoba('2026-12-07'));
  assert.equal(warn.mock.calls.length, 1);
  assert.equal(
    warn.mock.calls[0].arguments[0],
    'Calendario del Colegio vence el 28/12/2026: cargar el tramo siguiente en src/lib/colegioFechas.ts'
  );
});

test('advertirSiCalendarioPorVencer: después de vencido el calendario — sigue avisando', (t) => {
  const warn = t.mock.method(console, 'warn');
  advertirSiCalendarioPorVencer(hoyCordoba('2027-01-15'));
  assert.equal(warn.mock.calls.length, 1);
});
