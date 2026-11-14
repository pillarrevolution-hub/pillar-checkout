import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarCelular, formatoCelular } from '../celular.ts';

test('validarCelular: válidos — distintos formatos, todos el mismo número', () => {
  assert.deepEqual(validarCelular('3512501234'), { ok: true, normalizado: '3512501234' });
  assert.deepEqual(validarCelular('0351 15 250-1234'), { ok: true, normalizado: '3512501234' });
  assert.deepEqual(validarCelular('+54 9 351 250 1234'), { ok: true, normalizado: '3512501234' });
  assert.deepEqual(validarCelular('11 1234 5678'), { ok: true, normalizado: '1112345678' });
  assert.deepEqual(validarCelular('549 351 2501234'), { ok: true, normalizado: '3512501234' });
});

test('validarCelular: inválidos — corto, largo, vacío', () => {
  assert.equal(validarCelular('351250').ok, false);
  assert.equal(validarCelular('35125012345678').ok, false);
  assert.equal(validarCelular('').ok, false);
});

test('formatoCelular: "3512501234" -> "351 250-1234"', () => {
  assert.equal(formatoCelular('3512501234'), '351 250-1234');
});
