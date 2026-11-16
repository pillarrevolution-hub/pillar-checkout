import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchUnicoDifuso, matchExactoLocalidad, sugerirLocalidades, tarifaEnvio, TARIFA_CORDOBA, TARIFA_RESTO } from '../envios.ts';

test('tarifaEnvio: Córdoba capital paga la tarifa de Córdoba', () => {
  assert.equal(tarifaEnvio('Córdoba'), TARIFA_CORDOBA);
  assert.equal(TARIFA_CORDOBA, 15000);
});

test('tarifaEnvio: Alta Gracia (Córdoba, interior) paga la misma tarifa que la capital — es por PROVINCIA', () => {
  assert.equal(tarifaEnvio('Córdoba'), TARIFA_CORDOBA);
});

test('tarifaEnvio: Rosario (Santa Fe) paga la tarifa del resto del país', () => {
  assert.equal(tarifaEnvio('Santa Fe'), TARIFA_RESTO);
  assert.equal(TARIFA_RESTO, 17000);
});

test('tarifaEnvio: Ciudad Autónoma de Buenos Aires paga la tarifa del resto del país', () => {
  assert.equal(tarifaEnvio('Ciudad Autónoma de Buenos Aires'), TARIFA_RESTO);
});

test('tarifaEnvio: sin provincia (todavía no la resolvió Google ni el paciente) — null, no hay tarifa que mostrar', () => {
  assert.equal(tarifaEnvio(''), null);
  assert.equal(tarifaEnvio(null), null);
  assert.equal(tarifaEnvio(undefined), null);
});

test('tarifaEnvio: tolera mayúsculas/tildes/espacios como el resto de envios.ts', () => {
  assert.equal(tarifaEnvio('CORDOBA'), TARIFA_CORDOBA);
  assert.equal(tarifaEnvio('  cordoba  '), TARIFA_CORDOBA);
});

const LOCALIDADES = ['Río Cuarto', 'Río Tercero', 'Río Segundo', 'Alta Gracia', 'Villa María'];

test('matchUnicoDifuso: una sola candidata sin tilde — auto-acepta el nombre oficial', () => {
  assert.equal(matchUnicoDifuso('Alta Grac', LOCALIDADES), 'Alta Gracia');
  assert.equal(matchUnicoDifuso('villa mar', LOCALIDADES), 'Villa María');
});

test('matchUnicoDifuso: menos de 3 caracteres — no resuelve nada', () => {
  assert.equal(matchUnicoDifuso('Al', LOCALIDADES), null);
});

test('matchUnicoDifuso: varias candidatas (ambiguo) — null, el paciente tiene que elegir', () => {
  assert.equal(matchUnicoDifuso('Rio', LOCALIDADES), null);
});

test('matchUnicoDifuso: ninguna candidata — null', () => {
  assert.equal(matchUnicoDifuso('Buenos Aires', LOCALIDADES), null);
});

test('matchUnicoDifuso: ya es el nombre oficial exacto — sigue devolviéndolo (consistente con matchExactoLocalidad)', () => {
  assert.equal(matchUnicoDifuso('Alta Gracia', LOCALIDADES), 'Alta Gracia');
  assert.equal(matchExactoLocalidad('Alta Gracia', LOCALIDADES), 'Alta Gracia');
});

test('sugerirLocalidades sigue devolviendo todas las candidatas cuando hay ambigüedad', () => {
  assert.deepEqual(sugerirLocalidades('Rio', LOCALIDADES), ['Río Cuarto', 'Río Segundo', 'Río Tercero']);
});
