import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// A3 (14-nov): validación de celular argentino (10 dígitos) + línea de
// solo lectura cuando Malvinas ya lo manda (paciente.celular). Corre
// contra el stub de Malvinas (scripts/stub-malvinas.mjs en :3000) — NUNCA
// contra Malvinas real. Cotización 164: sin paciente.celular (campo
// editable). Cotización 165: con paciente.celular (línea de solo
// lectura).
//
// C2 (14-nov): el campo celular se mudó del viejo Paso 2 ("Datos") al
// paso de Pago, que absorbió sus dos campos (celular + comentarios) al
// fusionarse con "¿Cómo querés pagar?" — mismo id="celular", el helper
// de abajo solo actualiza el texto del botón de la Home y la modalidad
// elegida en el Paso 1.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function irAPasoPagoBadra(page: Page, cotizacion: number) {
  await page.goto(`/c/${cotizacion}/aaaaaaaaaaaa`);
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
  await page.getByRole('radio', { name: /nueva farmacia badra/i }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();
  await page.waitForSelector('h2');
}

test.describe('Celular argentino — validación y línea de solo lectura (390px)', () => {
  test('campo con error: "351250" no alcanza (menos de 10 dígitos)', async ({ page }) => {
    await irAPasoPagoBadra(page, 164);
    await page.fill('#celular', '351250');
    await page.locator('#celular').blur();
    await expect(page.getByText('Escribí tu celular con código de área, sin el 0 ni el 15 (10 dígitos)')).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a3-error.png') });
  });

  test('campo válido: el error desaparece y deja avanzar', async ({ page }) => {
    await irAPasoPagoBadra(page, 164);
    await page.fill('#celular', '0351 15 250-1234');
    await page.locator('#celular').blur();
    await expect(page.getByText(/Escribí tu celular/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /^siguiente$/i })).toBeEnabled();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a3-valido.png') });
  });

  test('celular ya cargado por Malvinas: línea de solo lectura, sin campo', async ({ page }) => {
    await irAPasoPagoBadra(page, 165);
    await expect(page.getByText(/Te avisamos al 351 250-1234/)).toBeVisible();
    await expect(page.getByRole('button', { name: /cambiarlo/i })).toBeVisible();
    await expect(page.locator('#celular')).toHaveCount(0);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'a3-solo-lectura.png') });
  });
});
