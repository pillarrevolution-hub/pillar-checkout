import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// A2 (13-nov): los tres textos de la pantalla previa al pago
// (transferencia / Mercado Pago contado / 3 cuotas). Corre contra el
// stub de Malvinas (scripts/stub-malvinas.mjs en :3000) — NUNCA contra
// Malvinas real: la cotización de prueba (o=164) está fija en el stub.
//
// Arrancar antes: `node scripts/stub-malvinas.mjs &` y después
// `npx playwright test tests/paso4-textos.spec.ts`.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function irAPaso4(page: Page, pago: 'transferencia' | 'mp' | 'cuotas') {
  // t = 12 hex cualquiera: obtenerDatos solo valida el FORMATO, la firma
  // la valida Malvinas real — acá es el stub, no le importa.
  await page.goto('/c/164/aaaaaaaaaaaa');
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();

  // C2 (14-nov): la modalidad se elige y confirma en el Paso 1 (Badra no
  // pide más datos); "Siguiente" lleva directo al paso de Pago, que ahora
  // fusiona celular + comentarios + método de pago (antes eran dos pasos
  // separados, Datos y Pago).
  await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
  await page.getByRole('radio', { name: /nueva farmacia badra/i }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();

  await page.fill('#celular', '3511234567');
  const nombreOpcion =
    pago === 'transferencia' ? /^Transferencia/i : pago === 'mp' ? /^Mercado Pago/i : /^3 cuotas/i;
  await page.getByRole('radio', { name: nombreOpcion }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();

  // Paso de Pagar: el h2 de "Vas a pagar…" (o "Transferí…") ya tiene que estar.
  await page.waitForSelector('h2');
}

test.describe('Paso4Pagar — tres textos previos al pago (390px)', () => {
  test('Transferencia', async ({ page }) => {
    await irAPaso4(page, 'transferencia');
    await expect(page.locator('h2')).toContainText(/Transferí/i);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a2-transferencia.png') });
  });

  test('Mercado Pago contado (1 cuota) — con la leyenda del 15%', async ({ page }) => {
    await irAPaso4(page, 'mp');
    await expect(page.locator('h2')).toContainText(/con Mercado Pago/i);
    await expect(page.getByText(/el 15% de descuento aplica pagando con dinero en cuenta/i)).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a2-mp-contado.png') });
  });

  test('3 cuotas — "3 cuotas de … · Total …"', async ({ page }) => {
    await irAPaso4(page, 'cuotas');
    await expect(page.locator('h2')).toContainText(/3 cuotas de/i);
    await expect(page.locator('h2')).toContainText(/Total/i);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a2-3-cuotas.png') });
  });
});
