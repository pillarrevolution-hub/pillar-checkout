import { test } from 'node:test';
import assert from 'node:assert/strict';
import { armarDomicilioElegido } from '../domicilio.ts';
import { tarifaEnvio } from '../envios.ts';

// Fixtures con la MISMA forma que devuelve GET places/{placeId} de Google
// (Essentials: addressComponents, formattedAddress) para tres direcciones
// reales de Argentina — Córdoba capital, Rosario y CABA (la de CABA,
// además, sin `locality` ni `administrative_area_level_2`, para ejercitar
// la tercera rama de la cascada de localidad: `sublocality`).

const FIXTURE_CORDOBA_CAPITAL = {
  placeId: 'TEST_PLACE_CORDOBA_CAPITAL',
  formattedAddress: 'Av. Colón 1234, X5000 Córdoba, Argentina',
  addressComponents: [
    { longText: '1234', shortText: '1234', types: ['street_number'] },
    { longText: 'Avenida Colón', shortText: 'Av. Colón', types: ['route'] },
    { longText: 'Córdoba', shortText: 'Córdoba', types: ['locality', 'political'] },
    { longText: 'Capital', shortText: 'Capital', types: ['administrative_area_level_2', 'political'] },
    { longText: 'Córdoba', shortText: 'Córdoba', types: ['administrative_area_level_1', 'political'] },
    { longText: 'Argentina', shortText: 'AR', types: ['country', 'political'] },
    { longText: '5000', shortText: '5000', types: ['postal_code'] },
  ],
};

const FIXTURE_ROSARIO = {
  placeId: 'TEST_PLACE_ROSARIO',
  formattedAddress: 'Bv. Oroño 100, S2000 Rosario, Santa Fe, Argentina',
  addressComponents: [
    { longText: '100', shortText: '100', types: ['street_number'] },
    { longText: 'Boulevard Oroño', shortText: 'Bv. Oroño', types: ['route'] },
    { longText: 'Rosario', shortText: 'Rosario', types: ['locality', 'political'] },
    { longText: 'Rosario', shortText: 'Rosario', types: ['administrative_area_level_2', 'political'] },
    { longText: 'Santa Fe', shortText: 'Santa Fe', types: ['administrative_area_level_1', 'political'] },
    { longText: 'Argentina', shortText: 'AR', types: ['country', 'political'] },
    { longText: '2000', shortText: '2000', types: ['postal_code'] },
  ],
};

// Sin `locality` ni `administrative_area_level_2` a propósito: CABA no
// tiene partidos, y esta dirección puntual tampoco trae `locality` —
// tiene que caer en `sublocality` (el barrio).
const FIXTURE_CABA = {
  placeId: 'TEST_PLACE_CABA',
  formattedAddress: 'Av. Santa Fe 1500, C1425 Cdad. Autónoma de Buenos Aires, Argentina',
  addressComponents: [
    { longText: '1500', shortText: '1500', types: ['street_number'] },
    { longText: 'Avenida Santa Fe', shortText: 'Av. Santa Fe', types: ['route'] },
    { longText: 'Palermo', shortText: 'Palermo', types: ['sublocality_level_1', 'sublocality', 'political'] },
    {
      longText: 'Ciudad Autónoma de Buenos Aires',
      shortText: 'CABA',
      types: ['administrative_area_level_1', 'political'],
    },
    { longText: 'Argentina', shortText: 'AR', types: ['country', 'political'] },
    { longText: 'C1425', shortText: 'C1425', types: ['postal_code'] },
  ],
};

test('armarDomicilioElegido: Córdoba capital — $15.000', () => {
  const d = armarDomicilioElegido(FIXTURE_CORDOBA_CAPITAL.addressComponents, FIXTURE_CORDOBA_CAPITAL.formattedAddress, FIXTURE_CORDOBA_CAPITAL.placeId);
  assert.deepEqual(d, {
    calle: 'Avenida Colón',
    altura: '1234',
    localidad: 'Córdoba',
    provincia: 'Córdoba',
    codigoPostal: '5000',
    formatted: 'Av. Colón 1234, X5000 Córdoba, Argentina',
    placeId: 'TEST_PLACE_CORDOBA_CAPITAL',
  });
  assert.equal(tarifaEnvio(d.provincia), 15000);
});

test('armarDomicilioElegido: Rosario (Santa Fe) — $17.000', () => {
  const d = armarDomicilioElegido(FIXTURE_ROSARIO.addressComponents, FIXTURE_ROSARIO.formattedAddress, FIXTURE_ROSARIO.placeId);
  assert.deepEqual(d, {
    calle: 'Boulevard Oroño',
    altura: '100',
    localidad: 'Rosario',
    provincia: 'Santa Fe',
    codigoPostal: '2000',
    formatted: 'Bv. Oroño 100, S2000 Rosario, Santa Fe, Argentina',
    placeId: 'TEST_PLACE_ROSARIO',
  });
  assert.equal(tarifaEnvio(d.provincia), 17000);
});

test('armarDomicilioElegido: CABA — administrative_area_level_1 "Ciudad Autónoma de Buenos Aires" paga $17.000 (no Córdoba), localidad cae a sublocality', () => {
  const d = armarDomicilioElegido(FIXTURE_CABA.addressComponents, FIXTURE_CABA.formattedAddress, FIXTURE_CABA.placeId);
  assert.deepEqual(d, {
    calle: 'Avenida Santa Fe',
    altura: '1500',
    localidad: 'Palermo',
    provincia: 'Ciudad Autónoma de Buenos Aires',
    codigoPostal: 'C1425',
    formatted: 'Av. Santa Fe 1500, C1425 Cdad. Autónoma de Buenos Aires, Argentina',
    placeId: 'TEST_PLACE_CABA',
  });
  assert.equal(tarifaEnvio(d.provincia), 17000);
});

test('armarDomicilioElegido: sin street_number — altura vacía (el checkout pide la altura aparte)', () => {
  const d = armarDomicilioElegido(
    [
      { longText: 'Plaza San Martín', types: ['route'] },
      { longText: 'Córdoba', types: ['locality', 'political'] },
      { longText: 'Córdoba', types: ['administrative_area_level_1', 'political'] },
    ],
    'Plaza San Martín, Córdoba, Argentina',
    'TEST_PLACE_SIN_ALTURA'
  );
  assert.equal(d.altura, '');
  assert.equal(d.codigoPostal, '');
});
