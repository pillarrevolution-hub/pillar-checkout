#!/usr/bin/env node
// Stub mínimo de Mercado Pago para Playwright (C5, 16-nov): solo sirve
// GET /v1/payments/:id con 4 pagos de prueba ya aprobados — NUNCA
// pegarle a la API real de MP. Se activa seteando MP_API_URL=http://
// localhost:<STUB_PORT> y MP_ACCESS_TOKEN a cualquier valor (el stub no
// lo valida). /gracias es lo único que se prueba acá — la creación de
// la preferencia (crearPreferencia) no tiene stub porque no hace falta
// para este test.
import { createServer } from 'node:http';

const PORT = Number(process.env.STUB_PORT || 3002);

const METADATA_BASE = { nombre: 'ZZZ Prueba Claude', celular: '5493511234567' };

// tr (contado) = $70.822 → lista $83.320 — mismos números que el resto
// de los fixtures del repo (envios.test.ts, precios.test.ts).
const PAGOS = {
  '9001': {
    id: 9001,
    status: 'approved',
    transaction_amount: 70822, // contado, retiro RED — sin envío
    installments: 1,
    external_reference: '164|red|contado',
    metadata: { ...METADATA_BASE, tipo: 'contado', retiro_modo: 'red', retiro_lugar: 'Cerro', envio_localidad: '', envio_provincia: '', envio_monto: 0 },
  },
  '9002': {
    id: 9002,
    status: 'approved',
    transaction_amount: 87822, // contado $70.822 + envío Rosario $17.000
    installments: 1,
    external_reference: '166|Rosario|contado',
    metadata: {
      ...METADATA_BASE,
      tipo: 'contado',
      envio_localidad: 'Rosario',
      envio_provincia: 'Santa Fe',
      envio_monto: 17000,
      direccion_texto: 'Bv Oroño 100, Rosario',
    },
  },
  '9003': {
    id: 9003,
    status: 'approved',
    transaction_amount: 83320, // 3 cuotas, retiro RED — sin envío
    installments: 3,
    external_reference: '164|red|cuotas',
    metadata: { ...METADATA_BASE, tipo: 'cuotas', retiro_modo: 'red', retiro_lugar: 'Cerro', envio_localidad: '', envio_provincia: '', envio_monto: 0 },
  },
  '9004': {
    id: 9004,
    status: 'approved',
    transaction_amount: 100320, // 3 cuotas (lista $83.320) + envío Rosario $17.000
    installments: 3,
    external_reference: '166|Rosario|cuotas',
    metadata: {
      ...METADATA_BASE,
      tipo: 'cuotas',
      envio_localidad: 'Rosario',
      envio_provincia: 'Santa Fe',
      envio_monto: 17000,
      direccion_texto: 'Bv Oroño 100, Rosario',
    },
  },
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');

  const match = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
  if (req.method === 'GET' && match) {
    const pago = PAGOS[match[1]];
    if (!pago) {
      res.writeHead(404);
      res.end(JSON.stringify({ message: 'pago de prueba inexistente en el stub' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(pago));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'not found (stub-mp)' }));
});

server.listen(PORT, () => {
  console.log(`stub-mp: escuchando en :${PORT} (pagos de prueba 9001-9004)`);
});
