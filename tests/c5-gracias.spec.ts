import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// C5 (16-nov): /gracias refleja el medio de pago realmente usado
// (transferencia / Mercado Pago contado / 3 cuotas) y muestra el
// desglose con envío solo cuando corresponde. Corre contra DOS stubs:
// Malvinas (scripts/stub-malvinas.mjs, checkout-data/contacto-externa/
// pagada-externa) y Mercado Pago (scripts/stub-mp.mjs, GET
// /v1/payments/:id con 4 pagos de prueba ya aprobados) — para esto hace
// falta levantar el server con `MP_API_URL=http://localhost:<puerto del
// stub-mp> MP_ACCESS_TOKEN=cualquier-cosa` además del `MALVINAS_URL` de
// siempre. NUNCA pega contra la API real de Mercado Pago.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

const CLAVE_DRAFT = (o: number) => `pillar-checkout-draft-${o}`;

async function conBorradorSembrado(page: Page, o: number) {
  await page.addInitScript((clave) => {
    try {
      sessionStorage.setItem(clave, JSON.stringify({ paso: 1 }));
    } catch {
      /* noop */
    }
  }, CLAVE_DRAFT(o));
}

async function borradorSigueAhi(page: Page, o: number): Promise<boolean> {
  return page.evaluate((clave) => sessionStorage.getItem(clave) !== null, CLAVE_DRAFT(o));
}

test.describe('C5 — /gracias según el medio de pago y la modalidad (390px)', () => {
  test('transferencia + retiro: saludo con nombre, botón "Abrir WhatsApp", sin desglose, borrador borrado', async ({ page }) => {
    await conBorradorSembrado(page, 164);
    await page.goto('/gracias?transferencia=1&nombre=Juana&o=164&monto=70822');

    await expect(page.getByRole('heading', { name: 'Gracias, Juana.' })).toBeVisible();
    await expect(page.getByText('Cuando recibamos tu comprobante por WhatsApp te confirmamos el pago.')).toBeVisible();
    const boton = page.getByRole('link', { name: 'Abrir WhatsApp' });
    await expect(boton).toBeVisible();
    await expect(boton).toHaveAttribute('href', /wa\.me/);
    await expect(boton).toHaveAttribute('href', /cotizaci%C3%B3n%20%23164/);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c5-transferencia-retiro-390.png') });

    expect(await borradorSigueAhi(page, 164)).toBe(false);
  });

  test('transferencia + envío: mismo saludo (el medio no cambia el texto, la modalidad la decide el desglose — acá no hay porque no pasa por MP)', async ({
    page,
  }) => {
    await conBorradorSembrado(page, 166);
    await page.goto('/gracias?transferencia=1&nombre=Juana&o=166&monto=87822');
    await expect(page.getByRole('heading', { name: 'Gracias, Juana.' })).toBeVisible();
    expect(await borradorSigueAhi(page, 166)).toBe(false);
  });

  test('Mercado Pago contado + retiro RED: "¡Listo, Juana!", Pagaste $70.822, sin desglose, Malvinas recibe cuotas=1 sin envío', async ({
    page,
    request,
  }) => {
    await conBorradorSembrado(page, 164);
    await page.goto('/gracias?payment_id=9001');

    await expect(page.getByRole('heading', { name: '¡Listo, ZZZ Prueba Claude!' })).toBeVisible();
    await expect(page.getByText('Pagaste $70.822 con Mercado Pago.')).toBeVisible();
    await expect(page.getByText('Recibís: retiro en Farmacia RED Cerro')).toBeVisible();
    await expect(page.getByText('Tratamiento', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/Envío a/)).toHaveCount(0);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c5-mp-contado-retiro-390.png') });

    expect(await borradorSigueAhi(page, 164)).toBe(false);
    await expect
      .poll(async () => (await (await request.get('http://localhost:3000/debug/ultima-pagada-externa')).json())?.body)
      .toMatchObject({ cuotas: 1, envioMonto: 0, retiroModo: 'red' });
  });

  test('Mercado Pago contado + envío Rosario: Pagaste $70.822, desglose con descuento y envío, Total $87.822', async ({ page }) => {
    await conBorradorSembrado(page, 166);
    await page.goto('/gracias?payment_id=9002');

    await expect(page.getByText('Pagaste $70.822 con Mercado Pago.')).toBeVisible();
    await expect(page.getByText('Tratamiento', { exact: true })).toBeVisible();
    await expect(page.getByText('$83.320', { exact: false })).toBeVisible();
    await expect(page.getByText('Descuento 15%')).toBeVisible();
    await expect(page.getByText('−$12.498', { exact: false })).toBeVisible();
    await expect(page.getByText('Envío a Rosario, Santa Fe')).toBeVisible();
    await expect(page.getByText('$17.000', { exact: false })).toBeVisible();
    const total = page.locator('div', { hasText: /^Total/ }).filter({ has: page.locator('span', { hasText: '$87.822' }) });
    await expect(total.first()).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c5-mp-contado-envio-390.png') });
  });

  test('Mercado Pago 3 cuotas + retiro RED: "3 cuotas de $27.773 · Total $83.320", sin desglose (sin envío)', async ({ page }) => {
    await conBorradorSembrado(page, 164);
    await page.goto('/gracias?payment_id=9003');

    await expect(page.getByText('Pagaste 3 cuotas de $27.773 con Mercado Pago · Total $83.320.')).toBeVisible();
    await expect(page.getByText('Recibís: retiro en Farmacia RED Cerro')).toBeVisible();
    await expect(page.getByText('Tratamiento', { exact: true })).toHaveCount(0);
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c5-mp-cuotas-retiro-390.png') });
  });

  test('Mercado Pago 3 cuotas + envío Rosario: desglose sin línea de descuento, Total $100.320', async ({ page, request }) => {
    await conBorradorSembrado(page, 166);
    await page.goto('/gracias?payment_id=9004');

    await expect(page.getByText('Pagaste 3 cuotas de $27.773 con Mercado Pago · Total $83.320.')).toBeVisible();
    await expect(page.getByText('Tratamiento', { exact: true })).toBeVisible();
    await expect(page.getByText('Descuento 15%')).toHaveCount(0);
    await expect(page.getByText('Envío a Rosario, Santa Fe')).toBeVisible();
    const total = page.locator('div', { hasText: /^Total/ }).filter({ has: page.locator('span', { hasText: '$100.320' }) });
    await expect(total.first()).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c5-mp-cuotas-envio-390.png') });

    await expect
      .poll(async () => (await (await request.get('http://localhost:3000/debug/ultima-pagada-externa')).json())?.body)
      .toMatchObject({ cuotas: 3, envioMonto: 17000, envioProvincia: 'Santa Fe' });
  });
});
