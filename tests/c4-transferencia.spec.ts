import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { WHATSAPP_NUMERO_TEST } from './helpers';

// C4 (16-nov): se eliminó la subida de archivo del comprobante de
// transferencia — ahora el paciente lo manda por WhatsApp (botón con
// mensaje precargado) y recién después aparece "Ya envié el
// comprobante", que avisa a Malvinas (comprobante-externa, canal:
// 'whatsapp', sin archivo) y navega a /gracias. Corre contra el stub de
// Malvinas (scripts/stub-malvinas.mjs en :3000) — NUNCA contra Malvinas
// real.
//
// Arrancar antes: `node scripts/stub-malvinas.mjs &` y después
// `npx playwright test tests/c4-transferencia.spec.ts`.

const DIR_CAPTURAS = join(__dirname, '..', 'Docs', 'capturas-13nov');
mkdirSync(DIR_CAPTURAS, { recursive: true });

async function abrirPagoTransferencia(page: Page) {
  await page.goto('/c/164/aaaaaaaaaaaa');
  await page.getByRole('button', { name: /continuar con mi tratamiento/i }).click();
  await page.getByRole('radio', { name: /lo retiro en una farmacia/i }).click();
  await page.getByRole('radio', { name: /nueva farmacia badra/i }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();
  await page.fill('#celular', '3511234567');
  await page.getByRole('radio', { name: /^Transferencia/i }).click();
  await page.getByRole('button', { name: /^siguiente$/i }).click();
  await page.waitForSelector('h2');
}

test.describe('C4 — comprobante de transferencia por WhatsApp (390px)', () => {
  test('el botón de WhatsApp lleva el número, la cotización y el importe; "Ya envié" no existe todavía', async ({
    page,
  }) => {
    await abrirPagoTransferencia(page);

    await expect(page.getByRole('button', { name: /ya envié el comprobante/i })).toHaveCount(0);

    const boton = page.getByRole('link', { name: /enviar comprobante por whatsapp/i });
    await expect(boton).toBeVisible();
    const href = await boton.getAttribute('href');
    expect(href).toBeTruthy();
    const url = new URL(href!);
    expect(url.hostname).toBe('wa.me');
    if (WHATSAPP_NUMERO_TEST) {
      expect(url.pathname).toBe(`/${WHATSAPP_NUMERO_TEST}`);
    }
    const texto = decodeURIComponent(url.searchParams.get('text') ?? '');
    expect(texto).toContain('#164');
    expect(texto).toContain('$70.822');

    await page.screenshot({ path: join(DIR_CAPTURAS, 'c4-antes-click.png') });
  });

  test('clic en "Enviar comprobante por WhatsApp" abre wa.me y recién ahí aparece "Ya envié el comprobante"', async ({
    page,
    context,
  }) => {
    await abrirPagoTransferencia(page);

    // No hace falta (ni conviene) que el popup cargue wa.me de verdad.
    await context.route('https://wa.me/**', (route) => route.abort());
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: /enviar comprobante por whatsapp/i }).click(),
    ]);
    await popup.close().catch(() => {});

    const boton = page.getByRole('button', { name: /ya envié el comprobante/i });
    await expect(boton).toBeVisible();
    await expect(boton).toBeEnabled();

    await page.screenshot({ path: join(DIR_CAPTURAS, 'c4-despues-click.png') });
  });

  test('"Ya envié el comprobante" avisa a Malvinas con canal whatsapp (sin archivo) y navega a /gracias', async ({
    page,
    context,
    request,
  }) => {
    await abrirPagoTransferencia(page);

    await context.route('https://wa.me/**', (route) => route.abort());
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('link', { name: /enviar comprobante por whatsapp/i }).click(),
    ]);
    await popup.close().catch(() => {});

    await page.getByRole('button', { name: /ya envié el comprobante/i }).click();
    await page.waitForURL(/\/gracias/);
    await expect(
      page.getByText('Cuando recibamos tu comprobante por WhatsApp te confirmamos el pago')
    ).toBeVisible();

    const debug = await request.get('http://localhost:3000/debug/ultimo-comprobante-externa');
    const ultimo = await debug.json();
    expect(ultimo?.cotizacion).toBe(164);
    expect(ultimo?.body?.canal).toBe('whatsapp');
    expect(ultimo?.body?.celular).toBe('3511234567');
    // Nunca va archivo: la validación de mime/datosBase64 queda del lado
    // de Malvinas (comprobante-externa), pero el checkout ni los manda.
    expect(ultimo?.body?.datosBase64).toBeUndefined();
    expect(ultimo?.body?.mime).toBeUndefined();

    await page.screenshot({ path: join(DIR_CAPTURAS, 'c4-gracias.png') });
  });
});
