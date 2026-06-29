const { test } = require('node:test');
const assert = require('node:assert');

const { validarTarea, sesionesDeHoy } = require('./pomodoro');

test('devuelve el texto recortado cuando hay nombre', () => {
  assert.strictEqual(validarTarea('Estudiar'), 'Estudiar');
});

test('recorta espacios alrededor', () => {
  assert.strictEqual(validarTarea('  Leer libro  '), 'Leer libro');
});

test('usa "Sin nombre" si está vacío', () => {
  assert.strictEqual(validarTarea(''), 'Sin nombre');
});

test('usa "Sin nombre" si solo hay espacios', () => {
  assert.strictEqual(validarTarea('     '), 'Sin nombre');
});

test('usa "Sin nombre" con null', () => {
  assert.strictEqual(validarTarea(null), 'Sin nombre');
});

test('usa "Sin nombre" con undefined', () => {
  assert.strictEqual(validarTarea(undefined), 'Sin nombre');
});

test('convierte valores no-string (número) a texto', () => {
  assert.strictEqual(validarTarea(42), '42');
});

// ── Contador de pomodoros de hoy (fix del bug) ──────────────────────────────
test('sesionesDeHoy cuenta solo las sesiones del día actual', () => {
  const hoy = new Date().toISOString();
  const ayer = new Date(Date.now() - 864e5).toISOString();
  const log = [
    { date: ayer, task: 'viejo', minutes: 25 },
    { date: hoy, task: 'A', minutes: 25 },
    { date: hoy, task: 'B', minutes: 25 },
  ];
  assert.strictEqual(sesionesDeHoy(log).length, 2);
});

test('sesionesDeHoy devuelve vacío si no hay sesiones de hoy', () => {
  const ayer = new Date(Date.now() - 864e5).toISOString();
  assert.strictEqual(sesionesDeHoy([{ date: ayer, task: 'x', minutes: 25 }]).length, 0);
});
