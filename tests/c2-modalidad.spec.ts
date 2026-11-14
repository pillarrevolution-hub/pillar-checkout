import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';

// C2 (14-nov): la modalidad despliega sus campos en el mismo Paso 1
// (acordeón) y el viejo Paso 2 se fusionó con "¿Cómo querés pagar?".
// Corre contra el stub de Malvinas (scripts/stub-malvinas.mjs en :3000)
// — NUNCA contra Malvinas real. Cotización 164: sin `envios` (retiro
// solamente). Cotización 166: con `envios` + `localidades`, para poder
// probar el camino de Envío a domicilio.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function irAPaso1(page: Page, cotizacion: number) {
  await page.goto(`/c/${cotizacion}/aaaaaaaaaaaa`);
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await expect(page.getByText('¿Cómo querés recibirlo?')).toBeVisible();
}

test.describe('C2 — acordeón del Paso 1 y Pago fusionado (390px)', () => {
  // Sin esto, las capturas pueden caer a mitad del fade-in de 150ms del
  // panel (`fade-paso`, ya reducido a "sin animación" bajo
  // prefers-reduced-motion) y salir semitransparentes — de paso, confirma
  // que el acordeón se ve completo de entrada con reduced-motion.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('RED: el selector de sucursal se despliega bajo la opción', async ({ page }) => {
    await irAPaso1(page, 164);
    await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital · Farmacias RED/i }).click();
    await expect(page.locator('#farmacia-red')).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c2-red-390.png') });
  });

  test('Badra: la tarjeta fija se despliega bajo la opción, sin pedir más datos', async ({ page }) => {
    await irAPaso1(page, 164);
    await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /nueva farmacia badra/i }).click();
    await expect(page.getByText('Félix Paz 585, Córdoba capital')).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c2-badra-390.png') });
  });

  test('Colegio: localidad + caja de fecha de llegada se despliegan bajo la opción', async ({ page }) => {
    await irAPaso1(page, 164);
    await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /interior de córdoba/i }).click();
    await page.fill('#colegio-localidad', 'Alta Gracia');
    await page.locator('#colegio-localidad').blur();
    await expect(page.getByText(/tu localidad el|te confirmamos por whatsapp/i)).toBeVisible();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c2-colegio-390.png') });
  });

  test('Envío: localidad + combobox de dirección se despliegan bajo la opción', async ({ page }) => {
    await irAPaso1(page, 166);
    await page.getByRole('radio', { name: /envío a domicilio/i }).click();
    await page.fill('#envio-localidad', 'Alta Gracia');
    await page.locator('#envio-localidad').blur();
    await expect(page.locator('#calle')).toBeEnabled();
    await page.fill('#calle', 'Av San Martín 100');
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c2-envio-390.png') });
  });

  test('Paso de Pago fusionado: celular + comentarios arriba del resumen', async ({ page }) => {
    await irAPaso1(page, 164);
    await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /nueva farmacia badra/i }).click();
    await page.getByRole('button', { name: /^siguiente$/i }).click();
    await expect(page.getByText('¿Cómo querés pagar?')).toBeVisible();
    await page.fill('#celular', '3511234567');
    await page.fill('#comentarios', 'Dejar con el portero si no estoy');
    await expect(page.getByRole('button', { name: /^siguiente$/i })).toBeEnabled();
    await page.screenshot({ path: join(DIR_CAPTURAS, 'c2-pago-390.png') });
  });

  test('Envío con dirección → cambiar a RED: la dirección no queda ni en el estado ni en el borrador', async ({ page }) => {
    await irAPaso1(page, 166);
    await page.getByRole('radio', { name: /envío a domicilio/i }).click();
    await page.fill('#envio-localidad', 'Alta Gracia');
    await page.locator('#envio-localidad').blur();
    await page.fill('#calle', 'Av San Martín 100');
    await expect(page.locator('#calle')).toHaveValue('Av San Martín 100');

    await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
    await page.getByRole('radio', { name: /Córdoba capital · Farmacias RED/i }).click();

    // La dirección no sobrevive al cambio de modalidad: el combobox de
    // calle ya no está en pantalla (modalidad distinta)...
    await expect(page.locator('#calle')).toHaveCount(0);

    // ...y tampoco quedó agazapada en el borrador de sessionStorage —
    // el regression real que pedía C2 (antes de la limpieza en el
    // reducer, `calle`/`envioLocalidadTexto` sobrevivían al cambio).
    const draft = await page.evaluate(() => {
      const raw = Object.keys(sessionStorage)
        .filter((k) => k.startsWith('pillar-checkout-draft-'))
        .map((k) => sessionStorage.getItem(k))[0];
      return raw ? JSON.parse(raw) : null;
    });
    expect(draft).toBeTruthy();
    expect(draft.calle).toBe('');
    expect(draft.envioLocalidadTexto).toBe('');
    expect(draft.direccionVerificada).toBe(false);
    expect(draft.recibe).toBe('retiro');
    expect(draft.retiroModo).toBe('red');

    // Volviendo a Envío tampoco resucita la dirección vieja.
    await page.getByRole('radio', { name: /envío a domicilio/i }).click();
    await expect(page.locator('#calle')).toHaveValue('');
  });
});
