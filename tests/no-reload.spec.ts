import { test, expect, type Page, type Request } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Repro del "parpadeo al volver" (v3.2, tema 1/3): Volver / la flecha
// atrás del navegador terminaban disparando una recarga COMPLETA del
// documento porque `history.pushState`/`replaceState` pisaban
// history.state entero, borrando los internals que Next.js App Router
// guarda ahí (__NA, __PRIVATE_NEXTJS_INTERNALS_TREE) — al no
// encontrarlos en el popstate, Next forzaba una navegación dura en vez
// de solo re-renderizar. El fix preserva ese state con
// `{ ...window.history.state, paso: n }`.
//
// Esta prueba no mide el síntoma visual (el parpadeo): mide la causa
// (¿hubo una petición de red al retroceder?) con una marca que solo
// sobrevive si el documento nunca se recargó.

async function marcarCarga(page: Page) {
  await page.evaluate(() => {
    (window as any).__cargaId = Date.now() + Math.random();
  });
  return page.evaluate(() => (window as any).__cargaId);
}

async function leerMarca(page: Page) {
  return page.evaluate(() => (window as any).__cargaId);
}

function contarRequestsDeDocumento(requests: Request[]) {
  // Cualquier request nueva durante un popstate de SPA sería sospechosa
  // (no debería haber ninguna), pero lo que de verdad delata una recarga
  // dura es un request de navegación al documento mismo.
  return requests.filter((r) => r.resourceType() === 'document');
}

async function irAPaso1(page: Page) {
  await page.getByRole('button', { name: /pagar mi tratamiento/i }).click();
  await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
}

async function irAPaso2RetiroRed(page: Page) {
  await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
  await page.getByRole('radio', { name: /Córdoba capital/i }).click();
  await page.locator('.btn-siguiente').click();
  await expect(page.getByText('¿En qué Farmacia RED lo retirás?')).toBeVisible();
}

test.describe('Sin parpadeo al volver — cero requests', () => {
  test('flecha atrás del navegador: cero requests, la página nunca se recarga', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    const marca = await marcarCarga(page);

    await irAPaso1(page);
    await irAPaso2RetiroRed(page);

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    await page.goBack(); // paso 2 -> paso 1
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await page.goBack(); // paso 1 -> Home
    await expect(page.getByText('Hola,')).toBeVisible();

    expect(contarRequestsDeDocumento(requests)).toHaveLength(0);
    expect(requests).toHaveLength(0);
    expect(await leerMarca(page)).toBe(marca);
  });

  test('botón "Volver": cero requests, la página nunca se recarga', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    const marca = await marcarCarga(page);

    await irAPaso1(page);
    await irAPaso2RetiroRed(page);

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    await page.locator('.btn-volver').click(); // paso 2 -> paso 1
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await page.getByText('Volver al inicio').click(); // paso 1 -> Home
    await expect(page.getByText('Hola,')).toBeVisible();

    expect(requests).toHaveLength(0);
    expect(await leerMarca(page)).toBe(marca);
  });

  test('ida y vuelta 3 veces seguidas sigue sin recargar', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    const marca = await marcarCarga(page);
    await irAPaso1(page);

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    for (let i = 0; i < 3; i++) {
      await page.goBack();
      await expect(page.getByText('Hola,')).toBeVisible();
      await page.goForward();
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    }

    expect(requests).toHaveLength(0);
    expect(await leerMarca(page)).toBe(marca);
  });
});
