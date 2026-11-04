import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAmount, formatOven, formatDuration, clock, fraction } from '../units.js';

const amount = (n, unit, factor, system) => formatAmount({ amount: n, unit }, factor, system);

test('native spoon fractions and ounce amounts do not collapse before or after scaling', () => {
  assert.equal(amount(1 / 8, 'tsp', 1, 'imperial'), '⅛ tsp');
  assert.equal(amount(1 / 8, 'tsp', 2, 'imperial'), '¼ tsp');
  assert.equal(amount(1 / 8, 'tsp', 0.5, 'imperial'), '0.0625 tsp');
  assert.equal(amount(1 / 8, 'tbsp', 1, 'imperial'), '⅛ tbsp');
  assert.equal(amount(0.75, 'oz', 1, 'imperial'), '0.75 oz');
  assert.equal(amount(0.35, 'oz', 2, 'imperial'), '0.7 oz');
  assert.equal(amount(25, 'g', 0.5, 'metric'), '12.5 g');
});

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

test('conversion preserves small and fractional quantities instead of rounding them to kitchen steps', () => {
  assert.equal(amount(1 / 8, 'tsp', 1, 'metric'), '0.61625 ml');
  assert.equal(amount(1 / 8, 'tsp', 2, 'metric'), '1.2325 ml');
  assert.equal(amount(1, 'tbsp', 1, 'metric'), '14.79 ml');
  assert.equal(amount(1, 'cup', 1, 'metric'), '236.6 ml');
  assert.equal(amount(8, 'oz', 1, 'metric'), '226.8 g');
  assert.equal(amount(1, 'lb', 1, 'metric'), '453.6 g');
  assert.equal(amount(2, 'in', 1, 'metric'), '5.08 cm');
});

test('US units written in the file survive the round trip in US mode', () => {
  assert.equal(amount(1, 'cup', 1, 'imperial'), '1 cup');
  assert.equal(amount(0.25, 'cup', 1, 'imperial'), '¼ cup');
  assert.equal(amount(2, 'tsp', 1.5, 'imperial'), '3 tsp');
  assert.equal(amount(1, 'lb', 1, 'imperial'), '1 lb');
  assert.equal(amount(12, 'oz', 2, 'imperial'), '1.5 lb');
});

test('US cup quantities preserve eighths in recipe amounts and portion scaling', () => {
  assert.equal(amount(3 / 8, 'cup', 1, 'imperial'), '⅜ cup');
  assert.equal(amount(1 + 1 / 8, 'cup', 1, 'imperial'), '1⅛ cups');
  assert.equal(amount(1 / 4, 'cup', 1.5, 'imperial'), '⅜ cup');
  assert.equal(amount(3 / 4, 'cup', 1.5, 'imperial'), '1⅛ cups');
});

test('conversions use the matching physical dimension and preserve the scaled amount', () => {
  assert.equal(amount(28.35, 'g', 2, 'imperial'), '2 oz');
  assert.equal(amount(453.6, 'g', 2, 'imperial'), '2 lb');
  assert.equal(amount(236.6, 'ml', 2, 'imperial'), '2 cups');
  assert.equal(amount(14.79, 'ml', 2, 'imperial'), '2 tbsp');
  assert.equal(amount(4.93, 'ml', 0.5, 'imperial'), '½ tsp');
  assert.equal(amount(2.54, 'cm', 2, 'imperial'), '2 in');
  assert.equal(amount(1, 'tbsp', 1, 'imperial'), '1 tbsp');
});

test('fraction formatting does not round decimal amounts to a nearby fraction or whole number', () => {
  assert.equal(fraction(1 / 3), '⅓');
  assert.equal(fraction(0.33), '0.33');
  assert.equal(fraction(1.3), '1.3');
  assert.equal(fraction(2.98), '2.98');
  assert.equal(fraction(0.005), '0.005');
});

test('oven temperatures always use Fahrenheit at the 25 °F marks', () => {
  assert.equal(formatOven({ celsius: 220, fan: true }), '425 °F convection');
  assert.equal(formatOven({ celsius: 180, fan: false }), '350 °F');
  assert.equal(formatOven({ celsius: 130, fan: false }), '275 °F');
  assert.equal(formatOven({ celsius: (425 - 32) * 5 / 9, fan: false }), '425 °F');
});

test('durations and clocks', () => {
  assert.equal(formatDuration(90), '1 h 30 min');
  assert.equal(formatDuration(120), '2 h');
  assert.equal(formatDuration(45), '45 min');
  assert.equal(clock(240), '4:00');
  assert.equal(clock(5400), '1:30:00');
});
