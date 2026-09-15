import { test, expect, type Page, type Request } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Repro del "la dirección verificada se revierte sola" (impeccable
// v3.2, 14-sep): clickear "Usar {localidad}" en la caja de localidad
// distinta le saca el foco a #calle ANTES de que corra el handler del
// botón. direccionVerificada todavía estaba en false en ese momento
// (es el caso de localidad distinta), así que el propio onBlur del
// campo se creía "sin tocar" y disparaba su propia re-verificación en
// paralelo — que tarda más (dos fetches de red: sugerir + detalle) y
// puede resolver DESPUÉS, pisando la dirección que el paciente ya
// había confirmado con un resultado distinto llegado tarde.
//
// Fix: seleccionadaRef en DireccionCombobox.tsx, prendido al elegir
// una sugerencia, apagado recién cuando el paciente vuelve a tocar el
// campo — alSalirDelCampo lo chequea y no hace nada mientras esté
// prendido.
//
// Esta prueba mide la CAUSA (cuántas veces se llama a
// /api/direcciones/detalle), no solo el síntoma visual: si el fix se
// revierte, tiene que fallar.

async function irAPaso2Envio(page: Page) {
  await page.goto(linkCheckoutTest());
  await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /me lo mandan a casa/i }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();
  await page.waitForSelector('#envio-localidad');
  await page.fill('#envio-localidad', 'Córdoba');
  await page.waitForSelector('#calle:not([disabled])', { timeout: 8_000 });
}

test.describe('Dirección verificada — no se revierte sola', () => {
  test('elegir una localidad distinta y usarla deja la dirección verificada 8s después, con UNA sola llamada a /detalle', async ({ page }) => {
    await irAPaso2Envio(page);

    const llamadasDetalle: Request[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/direcciones/detalle')) llamadasDetalle.push(r);
    });

    // Dirección real que Google resuelve a Villa Carlos Paz mientras la
    // localidad tipeada es Córdoba — dispara la caja de localidad
    // distinta.
    await page.fill('#calle', 'Av San Martin 100 Villa Carlos Paz');
    await page.waitForSelector('[role="listbox"]', { state: 'visible', timeout: 8_000 });
    await page.locator('[role="option"]', { hasText: /Carlos Paz/i }).first().click();

    const botonUsar = page.locator('button', { hasText: /^Usar / });
    await expect(botonUsar.first()).toBeVisible({ timeout: 8_000 });
    // El botón ya tiene que mostrar el precio ANTES de apretarlo.
    await expect(botonUsar.first()).toContainText(/envío/i);

    await botonUsar.first().click();

    // Confirmada: check verde + línea de dirección formateada.
    const confirmacion = page.locator('p', { hasText: /Villa Carlos Paz/i }).filter({ has: page.locator('svg') });
    await expect(confirmacion.first()).toBeVisible({ timeout: 5_000 });

    // El corazón de la prueba: 8 segundos de nada, y la dirección tiene
    // que seguir confirmada, sin ninguna caja ámbar nueva.
    await page.waitForTimeout(8_000);

    await expect(page.locator('.bg-amber-50')).toHaveCount(0);
    await expect(confirmacion.first()).toBeVisible();

    // Y la causa de fondo: una sola llamada a /detalle en toda la
    // secuencia (la de elegir la sugerencia). Si el guard se revierte,
    // esto da 2.
    expect(llamadasDetalle.length).toBe(1);
  });
});
