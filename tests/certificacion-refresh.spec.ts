import { test, expect, type Page } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Certificación v3.2 (D4), punto 2: F5 en cada paso de cada camino cae
// en el mismo paso, con los datos del borrador (sessionStorage).

test.describe('Certificación D4 — punto 2: refresh persiste paso y borrador', () => {
  test('camino envío: refresh en paso 1 y en paso 2 con datos cargados', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /me lo mandan a casa/i }).click();

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /me lo mandan a casa/i })).toHaveAttribute('aria-checked', 'true');

    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿A dónde lo mandamos?')).toBeVisible();
    await page.fill('#envio-localidad', 'Córdoba');
    await page.waitForSelector('#calle:not([disabled])', { timeout: 8_000 });
    await page.fill('#calle', 'Avenida Colón 100');
    await page.fill('#celular', '351 555 1234');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600); // deja que guardarContacto/sessionStorage asiente

    await page.reload();
    await expect(page.getByText('¿A dónde lo mandamos?')).toBeVisible();
    await expect(page.locator('#envio-localidad')).toHaveValue('Córdoba');
    await expect(page.locator('#calle')).toHaveValue('Avenida Colón 100');
    await expect(page.locator('#celular')).toHaveValue('351 555 1234');
  });

  test('camino RED: refresh en paso 1 y en paso 2 con sucursal y celular cargados', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital/i }).click();

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Córdoba capital/i })).toHaveAttribute('aria-checked', 'true');

    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿En qué Farmacia RED lo retirás?')).toBeVisible();
    await page.selectOption('#farmacia-red', { index: 1 });
    await page.fill('#celular', '351 555 4321');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿En qué Farmacia RED lo retirás?')).toBeVisible();
    await expect(page.locator('#celular')).toHaveValue('351 555 4321');
    const valorSeleccionado = await page.locator('#farmacia-red').inputValue();
    expect(valorSeleccionado).not.toBe('');
  });

  test('camino Colegio: refresh en paso 1 y en paso 2 con localidad cargada', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Interior de Córdoba/i }).click();

    await page.reload();
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Interior de Córdoba/i })).toHaveAttribute('aria-checked', 'true');

    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿En qué localidad lo retirás?')).toBeVisible();
    await page.fill('#colegio-localidad', 'Alta Gracia');
    await page.fill('#celular', '351 555 7777');
    await page.locator('#celular').blur();
    await page.waitForTimeout(600);

    await page.reload();
    await expect(page.getByText('¿En qué localidad lo retirás?')).toBeVisible();
    await expect(page.locator('#colegio-localidad')).toHaveValue('Alta Gracia');
    await expect(page.locator('#celular')).toHaveValue('351 555 7777');
  });
});
