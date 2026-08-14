const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const errores = [];
  page.on('console', (m) => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });
  page.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message));
  const url = 'http://localhost:3100/cotizacion?p=eyJ2IjoxLCJvIjo3LCJuIjoiTWlyaWFtIiwidHIiOjEzNDQ0NSwibGkiOjE1ODE3MSwiZWMiOjUwMDAsImVsIjoxMDAwMCwiZCI6IjIwMjYtMDgtMjAifQ&t=073bd028b65ff9302077b0c223933597';
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const body = await page.textContent('body');
  console.log('TEXTO:', body.slice(0, 160).replace(/\s+/g, ' '));
  console.log('¿Application error?:', body.includes('Application error') ? 'SÍ' : 'no');
  console.log('--- errores capturados:', errores.length);
  errores.slice(0, 8).forEach((e) => console.log(e));
  // Probar interacción: elegir envío
  try {
    await page.click('text=Retiro en farmacia');
    await page.waitForTimeout(800);
    console.log('click envío OK, aparece paso 2:', (await page.textContent('body')).includes('Transferencia bancaria') ? 'SÍ' : 'NO');
  } catch (e) { console.log('click envío FALLÓ:', e.message.split('\n')[0]); }
  errores.slice(8, 16).forEach((e) => console.log(e));
  await browser.close();
})().catch((e) => { console.error('SCRIPT:', e.message); process.exit(1); });
