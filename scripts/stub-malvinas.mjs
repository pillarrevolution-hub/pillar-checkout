#!/usr/bin/env node
// Stub mínimo de Malvinas para Playwright: NUNCA pegarle a producción
// (el .env.local real apunta ahí) — esto se levanta en :3000 y responde
// checkout-data/contacto-externa/comprobante-externa con una cotización
// de prueba fija, para poder navegar el checkout completo sin tocar
// datos reales. Reusar en todas las correcciones que necesiten Playwright
// hasta Paso4+.
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT || 3000);

// Cotización ZZZ de prueba — contado $70.822 (sin envío: sin `envios`,
// la opción "Envío a domicilio" queda deshabilitada y el checkout solo
// ofrece retiro).
const COTIZACION = {
  v: 1,
  o: 164,
  n: 'ZZZ Prueba Claude',
  tr: 70822,
  li: 83320,
  pagada: false,
  comprobanteRecibido: false,
};

function leerBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && /^\/api\/cotizaciones\/\d+\/checkout-data$/.test(url.pathname)) {
    res.writeHead(200);
    res.end(JSON.stringify(COTIZACION));
    return;
  }

  if (req.method === 'POST' && /^\/api\/cotizaciones\/\d+\/contacto-externa$/.test(url.pathname)) {
    await leerBody(req);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && /^\/api\/cotizaciones\/\d+\/comprobante-externa$/.test(url.pathname)) {
    await leerBody(req);
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found (stub-malvinas)' }));
});

server.listen(PORT, () => {
  console.log(`stub-malvinas: escuchando en :${PORT} (cotización de prueba o=${COTIZACION.o})`);
});
