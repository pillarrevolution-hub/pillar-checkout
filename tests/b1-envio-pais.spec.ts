import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// B1 (16-nov): envío a todo el país con dos tarifas planas por
// provincia ($15.000 Córdoba / $17.000 resto) — se desarma el tarifario
// por localidad y la sugerencia difusa (buscarTarifa/sugerirTarifas,
// eliminados de src/lib/envios.ts). La provincia la resuelve Google
// (DireccionCombobox) o, si no respondió, el `<select>` de Plan B que
// aparece debajo de la dirección — estos tests usan ese select a
// propósito, para no depender de una llamada real a Google y poder
// afirmar el precio de forma determinística. Corre contra el stub de
// Malvinas (scripts/stub-malvinas.mjs en :3000) — NUNCA contra Malvinas
// real. Cotización 166: con `envios` (tarifas deprecadas, se ignoran).

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function irAEnvio(page: Page, localidad: string) {
  await page.goto('/c/166/aaaaaaaaaaaa');
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /envío a domicilio/i }).click();
  await page.fill('#envio-localidad', localidad);
  await expect(page.locator('#envio-provincia')).toBeVisible();
}

test.describe('B1 — envío a todo el país, tarifa plana por provincia (390px)', () => {
  test('Córdoba → $15.000 en pantalla y en el body que recibe Malvinas', async ({ page, request }) => {
    await irAEnvio(page, 'Alta Gracia');
    await page.selectOption('#envio-provincia', 'Córdoba');

    await expect(page.getByText('El envío cuesta $15.000')).toBeVisible();
    await expect(page.locator('#envio-provincia')).toHaveCount(0);

    await page.fill('#calle', 'Av San Martín 100');
    await page.locator('#calle').blur();

    await expect
      .poll(async () => {
        const debug = await request.get('http://localhost:3000/debug/ultimo-contacto-externa');
        return (await debug.json())?.body;
      })
      .toMatchObject({ envioLocalidad: 'Alta Gracia', envioProvincia: 'Córdoba', envioMonto: 15000 });

    await page.screenshot({ path: join(DIR_CAPTURAS, 'b1-cordoba-390.png') });
  });

  test('Santa Fe → $17.000 en pantalla y en el body que recibe Malvinas', async ({ page, request }) => {
    await irAEnvio(page, 'Rosario');
    await page.selectOption('#envio-provincia', 'Santa Fe');

    await expect(page.getByText('El envío cuesta $17.000')).toBeVisible();

    await page.fill('#calle', 'Bv Oroño 100');
    await page.locator('#calle').blur();

    await expect
      .poll(async () => {
        const debug = await request.get('http://localhost:3000/debug/ultimo-contacto-externa');
        return (await debug.json())?.body;
      })
      .toMatchObject({ envioLocalidad: 'Rosario', envioProvincia: 'Santa Fe', envioMonto: 17000 });

    await page.screenshot({ path: join(DIR_CAPTURAS, 'b1-santa-fe-390.png') });
  });

  test('sin plazo de entrega visible en ningún lado del camino Envío', async ({ page }) => {
    await irAEnvio(page, 'Córdoba');
    await page.selectOption('#envio-provincia', 'Córdoba');
    await page.fill('#calle', 'Av Colón 100');

    const texto = await page.locator('#panel-envio').innerText();
    expect(texto).not.toMatch(/demora/i);
    expect(texto).not.toMatch(/24 hs|48 hs|sale martes y jueves/i);
  });

  test('cualquier localidad es entregable — no existe más el aviso de "no llegamos" (antes Rosario → Villa Del Rosario)', async ({
    page,
  }) => {
    await irAEnvio(page, 'Rosario');
    await expect(page.locator('.bg-amber-50')).toHaveCount(0);
    await expect(page.locator('#calle')).toBeEnabled();
  });
});
