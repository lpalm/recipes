import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, formatOven, formatDuration, clock, fraction } from '../units.js';

const amount = (n, unit, factor, system) => formatAmount({ amount: n, unit }, factor, system);

test('metric scales and keeps the written unit', () => {
  assert.equal(amount(200, 'g', 1.5, 'metric'), '300 g');
  assert.equal(amount(1.5, 'kg', 1 / 3, 'metric'), '500 g');
  assert.equal(amount(400, 'g', 3, 'metric'), '1.2 kg');
  assert.equal(amount(1, null, 1.5, 'metric'), '1½');
  assert.equal(amount(1, 'cloves', 1 / 3, 'metric'), '⅓ cloves');
  assert.equal(amount(0.4, 'g', 1, 'metric'), '0.4 g');
  assert.equal(amount(0.4, 'g', 1, 'imperial'), '0.4 g');
  assert.equal(amount(null, 'g', 2, 'metric'), '');
});

test('US units written in the file convert to metric at kitchen rounding', () => {
  assert.equal(amount(1, 'tsp', 1, 'metric'), '5 ml');
  assert.equal(amount(1, 'tsp', 0.5, 'metric'), '2.5 ml');
  assert.equal(amount(1, 'tbsp', 1, 'metric'), '15 ml');
  assert.equal(amount(1, 'cup', 1, 'metric'), '240 ml');
  assert.equal(amount(8, 'oz', 1, 'metric'), '225 g');
  assert.equal(amount(1, 'lb', 1, 'metric'), '455 g');
  assert.equal(amount(2, 'in', 1, 'metric'), '5.1 cm');
});

test('US units written in the file survive the round trip in US mode', () => {
  assert.equal(amount(1, 'cup', 1, 'imperial'), '1 cup');
  assert.equal(amount(0.25, 'cup', 1, 'imperial'), '¼ cup');
  assert.equal(amount(2, 'tsp', 1.5, 'imperial'), '1 tbsp');
  assert.equal(amount(1, 'lb', 1, 'imperial'), '1 lb');
  assert.equal(amount(12, 'oz', 2, 'imperial'), '1.5 lb');
});

test('imperial picks oz or lb by weight and cups, tbsp or tsp by volume', () => {
  assert.equal(amount(200, 'g', 1, 'imperial'), '7.1 oz');
  assert.equal(amount(600, 'g', 1, 'imperial'), '1.3 lb');
  assert.equal(amount(150, 'ml', 1, 'imperial'), '⅔ cup');
  assert.equal(amount(2, 'l', 1, 'imperial'), '8½ cups');
  assert.equal(amount(30, 'ml', 1, 'imperial'), '2 tbsp');
  assert.equal(amount(5, 'ml', 1, 'imperial'), '1 tsp');
  assert.equal(amount(3, 'cm', 1, 'imperial'), '1¼ in');
  assert.equal(amount(1, 'tbsp', 1, 'imperial'), '1 tbsp');
});

test('oven temperatures land on the 25 °F marks', () => {
  assert.equal(formatOven({ celsius: 220, fan: true }, 'imperial'), '425 °F convection');
  assert.equal(formatOven({ celsius: 180, fan: false }, 'imperial'), '350 °F');
  assert.equal(formatOven({ celsius: 220, fan: true }, 'metric'), '220 °C fan');
  assert.equal(formatOven({ celsius: (425 - 32) * 5 / 9, fan: false }, 'metric'), '220 °C');
});

test('durations and clocks', () => {
  assert.equal(formatDuration(90), '1 h 30 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(clock(240), '4:00');
  assert.equal(clock(5400), '1:30:00');
  assert.equal(fraction(0.33), '⅓');
  assert.equal(fraction(1.3), '1.3');
  assert.equal(fraction(2.98), '3');
});
