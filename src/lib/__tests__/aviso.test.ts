import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumenDesdePago } from '../aviso.ts';
import type { PagoMP } from '../mp.ts';

function pago(overrides: Partial<PagoMP> & { metadata: Record<string, unknown> }): PagoMP {
  return {
    id: 1,
    status: 'approved',
    transaction_amount: 0,
    ...overrides,
  };
}

test('resumenDesdePago: contado, retiro RED, sin envío — lista/descuento derivados del cobrado', () => {
  const r = resumenDesdePago(
    pago({
      transaction_amount: 70822,
      installments: 1,
      metadata: {
        nombre: 'Juana',
        tipo: 'contado',
        retiro_modo: 'red',
        retiro_lugar: 'Farmacia RED Cerro',
        envio_localidad: '',
        envio_provincia: '',
        envio_monto: 0,
        celular: '5493511234567',
      },
    }),
    '164'
  );
  assert.equal(r.installments, 1);
  assert.equal(r.monto, 70822);
  assert.equal(r.lista, 83320);
  assert.equal(r.descuento, 12498);
  assert.equal(r.cuota, 0);
  assert.equal(r.envioMonto, 0);
  assert.equal(r.envioLocalidad, '');
});

test('resumenDesdePago: contado + envío a Rosario ($17.000) — el desglose reconcilia con lo cobrado', () => {
  const r = resumenDesdePago(
    pago({
      transaction_amount: 87822, // 70.822 (contado) + 17.000 (envío)
      installments: 1,
      metadata: {
        nombre: 'Juana',
        tipo: 'contado',
        envio_localidad: 'Rosario',
        envio_provincia: 'Santa Fe',
        envio_monto: 17000,
        celular: '5493511234567',
      },
    }),
    '166'
  );
  assert.equal(r.lista, 83320);
  assert.equal(r.descuento, 12498);
  assert.equal(r.envioMonto, 17000);
  assert.equal(r.envioLocalidad, 'Rosario');
  assert.equal(r.envioProvincia, 'Santa Fe');
  // El "Total" que se muestra en /gracias tiene que coincidir con lo que
  // realmente cobró MP: lista - descuento + envío.
  assert.equal(r.lista - r.descuento + r.envioMonto, r.monto);
});

test('resumenDesdePago: 3 cuotas + envío — sin línea de descuento, cuota = lista/3', () => {
  const r = resumenDesdePago(
    pago({
      transaction_amount: 100320, // 83.320 (lista) + 17.000 (envío)
      installments: 3,
      metadata: {
        nombre: 'Juana',
        tipo: 'cuotas',
        envio_localidad: 'Rosario',
        envio_provincia: 'Santa Fe',
        envio_monto: 17000,
        celular: '5493511234567',
      },
    }),
    '166'
  );
  assert.equal(r.installments, 3);
  assert.equal(r.lista, 83320);
  assert.equal(r.descuento, 0);
  assert.equal(r.cuota, 27773);
  assert.equal(r.lista + r.envioMonto, r.monto);
});

test('resumenDesdePago: installments manda sobre la metadata `tipo` para decidir cuotas vs. contado', () => {
  const r = resumenDesdePago(
    pago({
      transaction_amount: 70822,
      installments: undefined,
      metadata: { nombre: 'Juana', tipo: 'cuotas', envio_localidad: '', envio_provincia: '', envio_monto: 0, celular: '' },
    }),
    '164'
  );
  // Sin `installments` (pagos viejos sin ese dato) se trata como 1 cuota,
  // pase lo que pase en la metadata — ver aviso.ts:33, misma prioridad
  // que ya usa avisarPagoAMalvinas.
  assert.equal(r.installments, 1);
  assert.equal(r.lista, 83320);
  assert.equal(r.descuento, 12498);
  assert.equal(r.cuota, 0);
});
