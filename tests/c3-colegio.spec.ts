import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// C3 (14-nov): textos del camino Interior (Colegio) + fallback cuando el
// calendario se queda sin fecha con margen de producción. Corre contra
// el stub de Malvinas (scripts/stub-malvinas.mjs en :3000) — NUNCA
// contra Malvinas real. `?hoy=` solo funciona fuera de producción
// (resolverHoy, src/lib/colegioFechas.ts).

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function abrirColegio(page: Page, hoy?: string) {
  const query = hoy ? `?hoy=${hoy}` : '';
  await page.goto(`/c/164/aaaaaaaaaaaa${query}`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
  await page.getByRole('radio', { name: /interior de córdoba/i }).click();
  await page.fill('#colegio-localidad', 'Alta Gracia');
  await page.locator('#colegio-localidad').blur();
}

test.describe('C3 — textos del Colegio (390px)', () => {
  test('con fecha: "Llega… el {fecha}; podrás retirar tu pedido una vez elaborado."', async ({ page }) => {
    // Fecha fija (no el reloj real) para que el test no dependa de cuándo
    // se corra: a esta altura el calendario (hasta 28-dic-2026) todavía
    // tiene margen de sobra.
    await abrirColegio(page, '2026-11-20');
    await expect(page.getByText(/podrás retirar tu pedido una vez elaborado/i)).toBeVisible();
    await expect(page.getByText(/unos días antes te avisamos por whatsapp/i)).toBeVisible();
    await expect(page.getByText(/ese día/i)).toHaveCount(0);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c3-colegio-con-fecha-390.png'), fullPage: true });
  });

  test('sin fecha disponible (calendario sin margen, ?hoy=2026-12-27): texto de WhatsApp, sin bloquear', async ({ page }) => {
    await abrirColegio(page, '2026-12-27');
    await expect(page.getByText('Te confirmamos la fecha de llegada por WhatsApp.')).toBeVisible();
    // El paso sigue avanzando igual: con la localidad confirmada alcanza,
    // no hace falta una fecha concreta.
    await expect(page.getByRole('button', { name: /^siguiente$/i })).toBeEnabled();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c3-colegio-sin-fecha-390.png'), fullPage: true });
  });
});
