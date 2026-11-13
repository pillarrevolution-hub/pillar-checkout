import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paymentMethodsPara } from './mp.ts';

test('paymentMethodsPara: contado (1 cuota, 15% descuento) excluye tarjeta de crédito', () => {
  assert.deepEqual(paymentMethodsPara(1), {
    installments: 1,
    default_installments: 1,
    excluded_payment_types: [{ id: 'credit_card' }],
  });
});

test('paymentMethodsPara: 3 cuotas no excluye nada', () => {
  assert.deepEqual(paymentMethodsPara(3), {
    installments: 3,
    default_installments: 3,
  });
});
