import { test, expect, type Page, type Request } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Certificación v3.2 (D4), punto 1: los tres caminos (envío, RED,
// Colegio), ida y vuelta con "Volver" y con la flecha atrás, bajo CPU
// 4x y Fast 3G — cero requests de documento al retroceder, sin
// pantalla blanca, sin salto de alto. Desde el paso 1 vuelve a la
// Home; desde la Home sale del checkout de verdad (hay una página
// previa real en el historial del navegador).

function contarRequestsDeDocumento(requests: Request[]) {
  return requests.filter((r) => r.resourceType() === 'document');
}

async function throttle(page: Page) {
  const client = await page.context().newCDPSession(page);
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  // Preset "Fast 3G" de Lighthouse.
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: (1.6 * 1000 * 1000) / 8,
    uploadThroughput: (750 * 1000) / 8,
    latency: 150,
  });
}

async function alturaTarjeta(page: Page) {
  return page.locator('.tarjeta').first().evaluate((el) => el.getBoundingClientRect().height);
}

test.describe('Certificación D4 — punto 1: parpadeo en los 3 caminos, con throttling', () => {
  test('camino envío: ida y vuelta con flecha atrás y con Volver, CPU 4x + Fast 3G', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await throttle(page);

    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /me lo mandan a casa/i }).click();
    const altoPaso1 = await alturaTarjeta(page);
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿A dónde lo mandamos?')).toBeVisible();
    const altoPaso2 = await alturaTarjeta(page);

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    for (let i = 0; i < 3; i++) {
      await page.goBack(); // paso2 -> paso1
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goBack(); // paso1 -> Home
      await expect(page.getByText('Hola,')).toBeVisible();
      await page.goForward(); // Home -> paso1
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goForward(); // paso1 -> paso2
      await expect(page.getByText('¿A dónde lo mandamos?')).toBeVisible();
    }

    expect(contarRequestsDeDocumento(requests)).toHaveLength(0);
    expect(requests).toHaveLength(0);
    // Shell único: ningún paso cae por debajo del piso de 520px (el bug
    // viejo era un salto HACIA ABAJO por min-height inconsistente, no que
    // todos los pasos midan lo mismo — paso 2 de envío tiene más campos
    // que paso 1 y es correcto que sea más alto).
    expect(altoPaso1).toBeGreaterThanOrEqual(520);
    expect(altoPaso2).toBeGreaterThanOrEqual(520);

    // Con el botón "Volver" también.
    await page.locator('.btn-volver').click(); // paso2 -> paso1
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await page.getByText('Volver al inicio').click(); // paso1 -> Home
    await expect(page.getByText('Hola,')).toBeVisible();
  });

  test('camino RED: ida y vuelta con flecha atrás, CPU 4x + Fast 3G', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await throttle(page);

    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital/i }).click();
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿En qué Farmacia RED lo retirás?')).toBeVisible();

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    for (let i = 0; i < 3; i++) {
      await page.goBack();
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goBack();
      await expect(page.getByText('Hola,')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('¿En qué Farmacia RED lo retirás?')).toBeVisible();
    }

    expect(requests).toHaveLength(0);
  });

  test('camino Colegio: ida y vuelta con flecha atrás, CPU 4x + Fast 3G', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await throttle(page);

    await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Interior de Córdoba/i }).click();
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿En qué localidad lo retirás?')).toBeVisible();

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    for (let i = 0; i < 3; i++) {
      await page.goBack();
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goBack();
      await expect(page.getByText('Hola,')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('¿En qué localidad lo retirás?')).toBeVisible();
    }

    expect(requests).toHaveLength(0);
  });

  test('desde la Home, la flecha atrás sale del checkout de verdad (hay historial previo real)', async ({ page }) => {
    // Página decoy previa, para tener un historial real del que "salir".
    await page.goto('about:blank');
    await page.goto(linkCheckoutTest());
    await expect(page.getByText('Hola,')).toBeVisible();

    await page.goBack();
    // Playwright espera la navegación real (no un popstate de SPA).
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain('about:blank');
  });
});
