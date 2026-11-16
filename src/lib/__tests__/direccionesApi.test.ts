import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sugerirDirecciones, detalleDireccion } from '../direccionesApi.ts';

function mockFetchOk(jsonBody: unknown) {
  return async () => new Response(JSON.stringify(jsonBody), { status: 200, headers: { 'content-type': 'application/json' } });
}

function mockFetch4xx(status = 400) {
  return async () => new Response('detalle interno de Google que NUNCA debe llegar al cliente', { status });
}

function mockFetchTimeout() {
  return async (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
    });
}

const original = global.fetch;
test.afterEach(() => {
  global.fetch = original;
});

test('sugerirDirecciones: sin key — { disponible: false }, nunca llama a Google', async () => {
  let llamadas = 0;
  global.fetch = (async () => {
    llamadas++;
    throw new Error('no debería llamarse');
  }) as typeof fetch;

  const r = await sugerirDirecciones({
    ip: '10.0.0.1',
    apiKey: undefined,
    texto: 'Av. Colón 1234',
    localidad: 'Córdoba',
    provincia: 'Córdoba',
    sessionToken: 'tok',
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { disponible: false });
  assert.equal(llamadas, 0);
});

test('sugerirDirecciones: respuesta OK de Google — mapea a { sugerencias }', async () => {
  global.fetch = mockFetchOk({
    suggestions: [
      {
        placePrediction: {
          placeId: 'abc123',
          structuredFormat: { mainText: { text: 'Av. Colón 1234' }, secondaryText: { text: 'Córdoba, Argentina' } },
        },
      },
    ],
  }) as typeof fetch;

  const r = await sugerirDirecciones({
    ip: '10.0.0.2',
    apiKey: 'fake-key',
    texto: 'Av. Colón 1234',
    localidad: 'Córdoba',
    provincia: 'Córdoba',
    sessionToken: 'tok',
  });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { sugerencias: [{ placeId: 'abc123', principal: 'Av. Colón 1234', secundario: 'Córdoba, Argentina' }] });
});

test('sugerirDirecciones: texto corto o sin localidad — no llama a Google, sugerencias vacío', async () => {
  let llamadas = 0;
  global.fetch = (async () => {
    llamadas++;
    return new Response('{}');
  }) as typeof fetch;

  const r1 = await sugerirDirecciones({ ip: '10.0.0.3', apiKey: 'fake-key', texto: 'Av.', localidad: 'Córdoba', provincia: '', sessionToken: 'tok' });
  assert.deepEqual(r1.body, { sugerencias: [] });
  const r2 = await sugerirDirecciones({ ip: '10.0.0.3', apiKey: 'fake-key', texto: 'Av. Colón 1234', localidad: '', provincia: '', sessionToken: 'tok' });
  assert.deepEqual(r2.body, { sugerencias: [] });
  assert.equal(llamadas, 0);
});

test('sugerirDirecciones: 4xx de Google — 502 genérico, sin filtrar el detalle de Google', async () => {
  global.fetch = mockFetch4xx(400) as typeof fetch;
  const r = await sugerirDirecciones({ ip: '10.0.0.4', apiKey: 'fake-key', texto: 'Av. Colón 1234', localidad: 'Córdoba', provincia: '', sessionToken: 'tok' });
  assert.equal(r.status, 502);
  assert.equal(JSON.stringify(r.body).includes('interno de Google'), false);
});

test('sugerirDirecciones: timeout — reintenta una vez y devuelve 502 genérico', async () => {
  let llamadas = 0;
  const base = mockFetchTimeout();
  global.fetch = (async (...args: Parameters<typeof fetch>) => {
    llamadas++;
    return base(args[0] as string, args[1] as RequestInit);
  }) as typeof fetch;

  const r = await sugerirDirecciones({ ip: '10.0.0.5', apiKey: 'fake-key', texto: 'Av. Colón 1234', localidad: 'Córdoba', provincia: '', sessionToken: 'tok' });
  assert.equal(r.status, 502);
  assert.equal(llamadas, 2); // 1 intento + 1 reintento
});

test('sugerirDirecciones: rate-limit — 30 OK, la request 31 del minuto da 429', async () => {
  global.fetch = mockFetchOk({ suggestions: [] }) as typeof fetch;
  const ip = '10.0.0.99';
  let ultimoStatus = 0;
  for (let i = 0; i < 31; i++) {
    const r = await sugerirDirecciones({ ip, apiKey: 'fake-key', texto: 'Av. Colón 1234', localidad: 'Córdoba', provincia: '', sessionToken: 'tok' });
    ultimoStatus = r.status;
    if (i < 30) assert.equal(r.status, 200, `request ${i + 1} debería pasar`);
  }
  assert.equal(ultimoStatus, 429);
});

test('detalleDireccion: sin key — { disponible: false }', async () => {
  const r = await detalleDireccion({ ip: '10.0.1.1', apiKey: undefined, placeId: 'abc', sessionToken: 'tok' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { disponible: false });
});

test('detalleDireccion: respuesta OK — lee addressComponents y location', async () => {
  global.fetch = mockFetchOk({
    formattedAddress: 'Av. Colón 1234, Córdoba, Argentina',
    location: { latitude: -31.4, longitude: -64.18 },
    addressComponents: [
      { longText: '1234', types: ['street_number'] },
      { longText: 'Avenida Colón', types: ['route'] },
      { longText: 'Córdoba', types: ['locality', 'political'] },
      { longText: 'Córdoba', types: ['administrative_area_level_1', 'political'] },
      { longText: '5000', types: ['postal_code'] },
    ],
  }) as typeof fetch;

  const r = await detalleDireccion({ ip: '10.0.1.2', apiKey: 'fake-key', placeId: 'abc123', sessionToken: 'tok' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, {
    calle: 'Avenida Colón',
    altura: '1234',
    localidadGoogle: 'Córdoba',
    provinciaGoogle: 'Córdoba',
    codigoPostal: '5000',
    formateada: 'Av. Colón 1234, Córdoba, Argentina',
    lat: -31.4,
    lng: -64.18,
  });
});

test('detalleDireccion: 4xx de Google — 502 genérico', async () => {
  global.fetch = mockFetch4xx(404) as typeof fetch;
  const r = await detalleDireccion({ ip: '10.0.1.3', apiKey: 'fake-key', placeId: 'abc123', sessionToken: 'tok' });
  assert.equal(r.status, 502);
});
