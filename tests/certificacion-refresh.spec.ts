import { test, expect, type Page } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Certificación v3.2 (D4), punto 2: F5 en cada paso de cada camino cae
// en el mismo paso, con los datos del borrador (sessionStorage).
//
// C2 (14-nov, actualizado 16-nov): los campos de cada modalidad viven
// en el acordeón del Paso 1 (ya no en un Paso 2 propio), y celular +
// comentarios se fusionaron con "¿Cómo querés pagar?" — el refresh se
// prueba en los dos puntos reales: adentro del acordeón (Paso 1) y en
// la pantalla de Pago. Cotización 166 (con `envios`) para el camino
// Envío; 164 (solo retiro) para RED/Colegio — ver scripts/stub-malvinas.mjs.

test.describe('Certificación D4 — punto 2: refresh persiste paso y borrador', () => {
  test('camino envío: refresh en el acordeón del Paso 1 y en el paso de Pago, con datos cargados', async ({ page }) => {
    await page.goto(linkCheckoutTest(166));
    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /envío a domicilio/i }).click();
    await page.fill('#envio-localidad', 'Córdoba');
    await page.waitForSelector('#calle:not([disabled])', { timeout: 8_000 });
    await page.fill('#calle', 'Avenida Colón 100');
    await page.locator('#calle').blur();
    await page.waitForTimeout(600); // deja que guardarContacto/sessionStorage asiente

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /envío a domicilio/i })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#envio-localidad')).toHaveValue('Córdoba');
    await expect(page.locator('#calle')).toHaveValue('Avenida Colón 100');

    await page.selectOption('#envio-provincia', 'Córdoba');
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await page.fill('#celular', '351 555 1234');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await expect(page.locator('#celular')).toHaveValue('351 555 1234');
  });

  test('camino RED: refresh en el acordeón del Paso 1 (con sucursal) y en el paso de Pago (con celular)', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital · Farmacias RED/i }).click();
    await page.selectOption('#farmacia-red', { index: 1 });
    await page.locator('#farmacia-red').dispatchEvent('blur');
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Córdoba capital · Farmacias RED/i })).toHaveAttribute('aria-checked', 'true');
    const valorSeleccionado = await page.locator('#farmacia-red').inputValue();
    expect(valorSeleccionado).not.toBe('');

    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await page.fill('#celular', '351 555 4321');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await expect(page.locator('#celular')).toHaveValue('351 555 4321');
  });

  test('camino Colegio: refresh en el acordeón del Paso 1 (con localidad) y en el paso de Pago (con celular)', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Interior de Córdoba/i }).click();
    await page.fill('#colegio-localidad', 'Alta Gracia');
    await page.locator('#colegio-localidad').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Interior de Córdoba/i })).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#colegio-localidad')).toHaveValue('Alta Gracia');

    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await page.fill('#celular', '351 555 7777');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await expect(page.locator('#celular')).toHaveValue('351 555 7777');
  });
});
