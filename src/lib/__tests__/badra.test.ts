import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarRetiroModo } from '../retiroModo.ts';
import { RETIRO_LUGAR_BADRA, FARMACIA_BADRA } from '../farmaciaBadra.ts';
import { descripcionRecibo, reciboMostrado } from '../mensajes.ts';
import { montoEnvio, total, type EleccionEnvio } from '../firma.ts';

test('normalizarRetiroModo acepta red/colegio/badra', () => {
  assert.equal(normalizarRetiroModo('red'), 'red');
  assert.equal(normalizarRetiroModo('colegio'), 'colegio');
  assert.equal(normalizarRetiroModo('badra'), 'badra');
});

test('normalizarRetiroModo ignora cualquier valor desconocido (nunca frena un pago)', () => {
  assert.equal(normalizarRetiroModo('mario'), '');
  assert.equal(normalizarRetiroModo(''), '');
  assert.equal(normalizarRetiroModo(undefined), '');
  assert.equal(normalizarRetiroModo(null), '');
  assert.equal(normalizarRetiroModo(123), '');
  assert.equal(normalizarRetiroModo('BADRA'), ''); // sensible a mayúsculas, como red/colegio
});

test('retiroLugar de Badra es el texto EXACTO que Malvinas ya acepta en producción', () => {
  assert.equal(RETIRO_LUGAR_BADRA, 'Nueva Farmacia Badra, Félix Paz 585');
  assert.equal(FARMACIA_BADRA.direccion, 'Félix Paz 585, Córdoba capital');
  assert.equal(FARMACIA_BADRA.horario, 'Lunes a viernes de 9 a 16 hs');
});

test('Badra no suma envío: cualquier retiro (incl. badra) usa EleccionEnvio {modo:"retiro"} → envío $0', () => {
  const eleccion: EleccionEnvio = { modo: 'retiro' };
  assert.equal(montoEnvio(eleccion), 0);
  const payload = { tr: 40162 };
  assert.equal(total(payload, eleccion, 'contado'), 40162);
  assert.equal(total(payload, eleccion, 'cuotas'), Math.round(40162 / 0.85));
});

test('texto de resumen de Badra incluye dirección y horario, igual en el mensaje y en la caja "Recibís:"', () => {
  const recibo = descripcionRecibo({ modo: 'badra' });
  assert.match(recibo, /Nueva Farmacia Badra, Félix Paz 585/);
  assert.match(recibo, /lunes a viernes de 9 a 16 hs/i);
  assert.equal(reciboMostrado({ modo: 'badra' }), recibo);
});
