import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  armarInputAutocomplete,
  coincideAproximado,
  leerDireccionGoogle,
  localidadesCoinciden,
  normalizarParaComparar,
} from '../direcciones.ts';

test('normalizarParaComparar / localidadesCoinciden: mayúsculas, tildes y espacios no importan', () => {
  assert.equal(localidadesCoinciden('Villa Carlos Paz', 'villa carlos paz'), true);
  assert.equal(localidadesCoinciden('Villa Carlos Paz', 'VILLA CARLOS PAZ'), true);
  assert.equal(localidadesCoinciden('Córdoba', 'Cordoba'), true);
});

test('localidadesCoinciden: "Ciudad de Córdoba" es lo mismo que "Córdoba"', () => {
  assert.equal(localidadesCoinciden('Ciudad de Córdoba', 'Córdoba'), true);
  assert.equal(localidadesCoinciden('Córdoba', 'Ciudad de Córdoba'), true);
});

test('localidadesCoinciden: localidades distintas no matchean (aunque compartan prefijo)', () => {
  assert.equal(localidadesCoinciden('Río Cuarto', 'Río Tercero'), false);
});

test('localidadesCoinciden: vacío nunca matchea con vacío', () => {
  assert.equal(localidadesCoinciden('', ''), false);
  assert.equal(localidadesCoinciden(null, undefined), false);
});

test('armarInputAutocomplete: con provincia', () => {
  assert.equal(
    armarInputAutocomplete('Av. Colón 1234', 'Córdoba', 'Córdoba'),
    'Av. Colón 1234, Córdoba, Córdoba, Argentina'
  );
});

test('armarInputAutocomplete: sin provincia (el tarifario no la trae) — no se inventa', () => {
  assert.equal(armarInputAutocomplete('San Martín 500', 'Pergamino', null), 'San Martín 500, Pergamino, Argentina');
  assert.equal(armarInputAutocomplete('San Martín 500', 'Pergamino', ''), 'San Martín 500, Pergamino, Argentina');
  assert.equal(armarInputAutocomplete('San Martín 500', 'Pergamino', undefined), 'San Martín 500, Pergamino, Argentina');
});

test('leerDireccionGoogle: con locality', () => {
  const r = leerDireccionGoogle([
    { longText: '1234', types: ['street_number'] },
    { longText: 'Avenida Colón', types: ['route'] },
    { longText: 'Córdoba', types: ['locality', 'political'] },
    { longText: 'Córdoba', types: ['administrative_area_level_1', 'political'] },
    { longText: '5000', types: ['postal_code'] },
  ]);
  assert.deepEqual(r, {
    calle: 'Avenida Colón',
    altura: '1234',
    localidadGoogle: 'Córdoba',
    provinciaGoogle: 'Córdoba',
    codigoPostal: '5000',
  });
});

test('leerDireccionGoogle: sin postal_code — código postal vacío (queda editable)', () => {
  const r = leerDireccionGoogle([
    { longText: '1234', types: ['street_number'] },
    { longText: 'Avenida Colón', types: ['route'] },
    { longText: 'Córdoba', types: ['locality', 'political'] },
  ]);
  assert.equal(r.codigoPostal, '');
});

test('leerDireccionGoogle: sin locality pero con administrative_area_level_2 — cae en cascada', () => {
  const r = leerDireccionGoogle([
    { longText: '500', types: ['street_number'] },
    { longText: 'San Martín', types: ['route'] },
    { longText: 'Pedanía Norte', types: ['administrative_area_level_2', 'political'] },
  ]);
  assert.equal(r.localidadGoogle, 'Pedanía Norte');
});

test('leerDireccionGoogle: sin street_number — altura vacía (Nos falta la altura)', () => {
  const r = leerDireccionGoogle([
    { longText: 'Avenida Colón', types: ['route'] },
    { longText: 'Córdoba', types: ['locality', 'political'] },
  ]);
  assert.equal(r.altura, '');
  assert.equal(r.calle, 'Avenida Colón');
});

test('coincideAproximado: lo tipeado vs. la primera sugerencia, tolerando mayúsculas/tildes/espacios', () => {
  assert.equal(coincideAproximado('av colon 1234', 'Av. Colón 1234'), true);
  assert.equal(coincideAproximado('AV. COLÓN 1234', 'Av. Colón  1234'), true);
  assert.equal(coincideAproximado('Av. Colón 1234', 'Av. Colón 1235'), false);
});
