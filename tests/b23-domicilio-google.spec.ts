import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// B2+B3 (16-nov): el autocomplete ya no sesga a un círculo de 50 km
// alrededor de Córdoba capital (B2 — ver ARGENTINA_BIAS en
// direccionesApi.ts, verificado a mano contra la API real) y, al elegir
// una sugerencia, el checkout guarda lo que devuelve Place Details
// (localidad, provincia, código postal), no el texto tipeado (B3). Estos
// tests mockean /api/direcciones/sugerir y /api/direcciones/detalle con
// page.route — NUNCA pegan contra Google real, para ser deterministas —
// y corren contra el stub de Malvinas (scripts/stub-malvinas.mjs en
// :3000). Cotización 166: con `envios`.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

const DETALLE_ROSARIO = {
  calle: 'Boulevard Oroño',
  altura: '100',
  localidadGoogle: 'Rosario',
  provinciaGoogle: 'Santa Fe',
  codigoPostal: '2000',
  formateada: 'Bv. Oroño 100, S2000 Rosario, Santa Fe, Argentina',
  lat: -32.9468,
  lng: -60.6393,
};

const DETALLE_SIN_ALTURA = {
  calle: 'Plaza San Martín',
  altura: '',
  localidadGoogle: 'Córdoba',
  provinciaGoogle: 'Córdoba',
  codigoPostal: '',
  formateada: 'Plaza San Martín, Córdoba, Argentina',
  lat: -31.4173,
  lng: -64.1833,
};

async function mockearGoogle(page: Page, principal: string, secundario: string, placeId: string, detalle: typeof DETALLE_ROSARIO) {
  await page.route('**/api/direcciones/sugerir', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sugerencias: [{ placeId, principal, secundario }] }),
    })
  );
  await page.route('**/api/direcciones/detalle', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(detalle) })
  );
}

async function irAEnvio(page: Page, localidad: string) {
  await page.goto('/c/166/aaaaaaaaaaaa');
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /envío a domicilio/i }).click();
  await page.fill('#envio-localidad', localidad);
}

test.describe('B2+B3 — buscador a toda Argentina y domicilio guardado desde Google (390px)', () => {
  test('elegir la sugerencia de Rosario completa provincia/CP y manda el domicilio de Google (no el texto tipeado)', async ({
    page,
    request,
  }) => {
    await mockearGoogle(page, 'Bv. Oroño 100', 'Rosario, Santa Fe', 'TEST_PLACE_ROSARIO', DETALLE_ROSARIO);
    await irAEnvio(page, 'Rosario');

    await page.fill('#calle', 'Bv Oroño 100');
    await page.waitForSelector('[role="listbox"]', { state: 'visible', timeout: 8_000 });
    await page.screenshot({ path: join(DIR_CAPTURAS, 'b23-lista-rosario-390.png') });

    await page.locator('[role="option"]', { hasText: /Oroño/i }).first().click();

    await expect(page.locator('#envio-cp')).toHaveValue('2000');
    await expect(page.getByText('El envío cuesta $17.000')).toBeVisible();
    const confirmacion = page.locator('p', { hasText: /Santa Fe/i }).filter({ has: page.locator('svg') });
    await expect(confirmacion.first()).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'b23-confirmacion-verde-390.png') });

    // guardarContacto se dispara al tocar "Siguiente" (igual que en el
    // resto del checkout) — elegir la sugerencia por sí sola no guarda,
    // a propósito (ver seleccionadaRef en DireccionCombobox.tsx).
    await page.getByRole('button', { name: /^siguiente$/i }).click();

    await expect
      .poll(async () => {
        const debug = await request.get('http://localhost:3000/debug/ultimo-contacto-externa');
        return (await debug.json())?.body;
      })
      .toMatchObject({ envioLocalidad: 'Rosario', envioProvincia: 'Santa Fe', envioMonto: 17000 });
  });

  test('sugerencia sin altura (una plaza) pide el número aparte y bloquea Siguiente hasta completarlo', async ({ page }) => {
    await mockearGoogle(page, 'Plaza San Martín', 'Córdoba', 'TEST_PLACE_SIN_ALTURA', DETALLE_SIN_ALTURA);
    await irAEnvio(page, 'Córdoba');

    await page.fill('#calle', 'Plaza San Martín');
    await page.waitForSelector('[role="listbox"]', { state: 'visible', timeout: 8_000 });
    await page.locator('[role="option"]', { hasText: /Plaza San Martín/i }).first().click();

    await expect(page.getByText('Nos falta la altura de esa calle', { exact: false })).toBeVisible();
    const siguiente = page.getByRole('button', { name: /^siguiente$/i });
    await expect(siguiente).toBeDisabled();
    await expect(page.getByText('Falta la altura de la calle')).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'b23-falta-altura-390.png') });

    await page.getByLabel('Altura').fill('100');
    await page.getByRole('button', { name: /confirmar altura/i }).click();

    await expect(siguiente).toBeEnabled();
    await expect(page.locator('#calle')).toHaveValue('Plaza San Martín 100');
  });
});
