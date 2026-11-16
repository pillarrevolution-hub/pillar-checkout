import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listaDesdeContado, cuotaDeLista } from '../precios.ts';

test('listaDesdeContado / cuotaDeLista: 70.822 → lista 83.320 → cuota 27.773', () => {
  const lista = listaDesdeContado(70822);
  assert.equal(lista, 83320);
  assert.equal(cuotaDeLista(lista), 27773);
});
