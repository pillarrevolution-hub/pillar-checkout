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
const COTIZACION_164 = {
  v: 1,
  o: 164,
  n: 'ZZZ Prueba Claude',
  tr: 70822,
  li: 83320,
  pagada: false,
  comprobanteRecibido: false,
};

// Misma cotización, pero con el celular YA cargado en la ficha del
// paciente (A3, 14-nov) — para probar que el Paso 2 no vuelve a
// pedirlo y muestra la línea de solo lectura.
const COTIZACION_165 = {
  ...COTIZACION_164,
  o: 165,
  paciente: { celular: '3512501234' },
};

// Con envíos (C2, 14-nov): tarifario mínimo para poder probar el camino
// "Envío a domicilio" del acordeón del Paso 1 (164/165 no tienen
// `envios`, así que esa opción queda deshabilitada para ellas a propósito).
const COTIZACION_166 = {
  ...COTIZACION_164,
  o: 166,
  envios: {
    recargo: 1000,
    leyenda: 'Envío a domicilio por un tercero por cuenta y orden del paciente.',
    tarifas: [
      { l: 'ALTA GRACIA', p: 'Córdoba', m: 13500, t: '24 hs' },
      { l: 'CORDOBA', p: 'Córdoba', m: 9000, t: '24 hs' },
    ],
  },
  localidades: ['Alta Gracia', 'Córdoba'],
};

const COTIZACIONES = { 164: COTIZACION_164, 165: COTIZACION_165, 166: COTIZACION_166 };

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

  const matchCheckoutData = url.pathname.match(/^\/api\/cotizaciones\/(\d+)\/checkout-data$/);
  if (req.method === 'GET' && matchCheckoutData) {
    const cotizacion = COTIZACIONES[matchCheckoutData[1]];
    if (!cotizacion) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'cotización de prueba inexistente en el stub' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(cotizacion));
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
  console.log(`stub-malvinas: escuchando en :${PORT} (cotizaciones de prueba o=164,165)`);
});
