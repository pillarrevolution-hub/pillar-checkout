import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchUnicoDifuso, matchExactoLocalidad, sugerirLocalidades } from '../envios.ts';

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
