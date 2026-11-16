import { test, expect, type Page, type Request } from '@playwright/test';
import { linkCheckoutTest } from './helpers';

// Certificación v3.2 (D4), punto 1: los tres caminos (envío, RED,
// Colegio), ida y vuelta con "Volver" y con la flecha atrás, bajo CPU
// 4x y Fast 3G — cero requests de documento al retroceder, sin
// pantalla blanca, sin salto de alto. Desde el paso 1 vuelve a la
// Home; desde la Home sale del checkout de verdad (hay una página
// previa real en el historial del navegador).
//
// C2 (14-nov, actualizado 16-nov): los campos de cada modalidad ya no
// viven en un Paso 2 propio por camino — se despliegan en el acordeón
// del Paso 1, y el único paso siguiente para los 3 caminos es el mismo
// "¿Cómo querés pagar?" (fusionado con el viejo Paso 2). Cotización 164
// (sin `envios`, solo retiro) sirve para RED/Colegio; 166 (con `envios`)
// para el camino Envío — ver scripts/stub-malvinas.mjs.

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
    await page.goto(linkCheckoutTest(166));
    await throttle(page);

    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /envío a domicilio/i }).click();
    await page.fill('#envio-localidad', 'Alta Gracia');
    await page.fill('#calle', 'Av San Martín 100');
    // Deja que se resuelva el fetch debounced de autocomplete (350ms) ANTES
    // de empezar a contar requests más abajo — si no, puede quedar
    // pendiente y aparecer como un request "de más" sin ser un reload.
    await page.waitForTimeout(500);
    await page.selectOption('#envio-provincia', 'Córdoba');
    const altoPaso1 = await alturaTarjeta(page);
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    const altoPaso2 = await alturaTarjeta(page);

    const requests: Request[] = [];
    page.on('request', (r) => requests.push(r));

    for (let i = 0; i < 3; i++) {
      await page.goBack(); // pago -> paso1
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goBack(); // paso1 -> Home
      await expect(page.getByText('Hola,')).toBeVisible();
      await page.goForward(); // Home -> paso1
      await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
      await page.goForward(); // paso1 -> pago
      await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    }

    expect(contarRequestsDeDocumento(requests)).toHaveLength(0);
    expect(requests).toHaveLength(0);
    // Shell único: ningún paso cae por debajo del piso de 520px (el bug
    // viejo era un salto HACIA ABAJO por min-height inconsistente, no que
    // todos los pasos midan lo mismo — el acordeón de envío abierto tiene
    // más campos que el paso de Pago y es correcto que sea más alto).
    expect(altoPaso1).toBeGreaterThanOrEqual(520);
    expect(altoPaso2).toBeGreaterThanOrEqual(520);

    // Con el botón "Volver" también.
    await page.locator('.btn-volver').click(); // pago -> paso1
    await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
    await page.getByText('Volver al inicio').click(); // paso1 -> Home
    await expect(page.getByText('Hola,')).toBeVisible();
  });

  test('camino RED: ida y vuelta con flecha atrás, CPU 4x + Fast 3G', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await throttle(page);

    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital · Farmacias RED/i }).click();
    await page.selectOption('#farmacia-red', { index: 1 });
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();

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
      await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    }

    expect(requests).toHaveLength(0);
  });

  test('camino Colegio: ida y vuelta con flecha atrás, CPU 4x + Fast 3G', async ({ page }) => {
    await page.goto(linkCheckoutTest());
    await throttle(page);

    await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
    await page.getByRole('radio', { name: /Lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Interior de Córdoba/i }).click();
    await page.fill('#colegio-localidad', 'Alta Gracia');
    await page.locator('#colegio-localidad').blur();
    await page.locator('.btn-siguiente').click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();

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
      await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
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
