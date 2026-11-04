// Scales quantities to the chosen portions in metric or US units; temperatures always use Fahrenheit.

const UNITS = {
  g: { family: 'weight', system: 'metric', base: 1 }, kg: { family: 'weight', system: 'metric', base: 1000 },
  oz: { family: 'weight', system: 'imperial', base: 28.35 }, lb: { family: 'weight', system: 'imperial', base: 453.6 },
  ml: { family: 'volume', system: 'metric', base: 1 }, l: { family: 'volume', system: 'metric', base: 1000 },
  tsp: { family: 'volume', system: 'imperial', base: 4.93 }, tbsp: { family: 'volume', system: 'imperial', base: 14.79 },
  cup: { family: 'volume', system: 'imperial', base: 236.6 },
  cm: { family: 'length', system: 'metric', base: 1 }, in: { family: 'length', system: 'imperial', base: 2.54 },
};
const ALIASES = { cups: 'cup', lbs: 'lb', inch: 'in', inches: 'in' };
// Count units keep their meaning when portion changes turn a single item into several.
const MEASURE_WORDS = new Map(Object.entries({
  pinch: 'pinches', handful: 'handfuls', clove: 'cloves', can: 'cans', slice: 'slices', bunch: 'bunches', sprig: 'sprigs',
  stick: 'sticks', stalk: 'stalks', head: 'heads', piece: 'pieces', leaf: 'leaves', sheet: 'sheets', knob: 'knobs', dash: 'dashes',
  drop: 'drops', splash: 'splashes', portion: 'portions', scoop: 'scoops', packet: 'packets', bag: 'bags', cube: 'cubes',
  block: 'blocks', pack: 'packs', bottle: 'bottles', fillet: 'fillets', ball: 'balls', tin: 'tins', jar: 'jars', tube: 'tubes',
}).flatMap(pair => pair.map(word => [word, pair])));
const GLYPHS = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞']];
const FRACTION_GLYPHS = Object.fromEntries(GLYPHS.map(([value, glyph]) => [glyph, value]));

export function normalizeUnit(word) {
  if (word in UNITS) return word;
  if (word in ALIASES) return ALIASES[word];
  return MEASURE_WORDS.has(word) ? word : null;
}

const decimal = x => String(Number(x.toPrecision(6)));
const roundTo = (x, step) => Number((Math.round(x / step) * step).toFixed(4));

// Only exact fractions get glyphs; rounding nearby amounts can hide a portion change.
export function fraction(x) {
  const whole = Math.floor(x);
  const rest = x - whole;
  const glyph = GLYPHS.find(([value]) => Math.abs(value - rest) < 1e-10);
  return glyph ? `${whole || ''}${glyph[1]}` : decimal(x);
}

// Keep tiny spice amounts in grams so they remain practical to weigh in US mode.
const grams = g => g >= 1000 ? `${decimal(g / 1000)} kg` : `${decimal(g)} g`;
const SHOW = {
  weight: {
    metric: grams,
    imperial: g => { const oz = g / UNITS.oz.base; return oz < 0.125 ? grams(g) : oz < 16 ? `${decimal(oz)} oz` : `${decimal(oz / 16)} lb`; },
  },
  volume: {
    metric: ml => ml >= 1000 ? `${decimal(ml / 1000)} l` : `${decimal(ml)} ml`,
    imperial: ml => ml >= 55 ? `${fraction(ml / UNITS.cup.base)} ${ml > UNITS.cup.base ? 'cups' : 'cup'}` : ml >= 14 ? `${fraction(ml / UNITS.tbsp.base)} tbsp` : `${fraction(ml / UNITS.tsp.base)} tsp`,
  },
  length: {
    metric: cm => `${decimal(cm)} cm`,
    imperial: cm => `${fraction(cm / UNITS.in.base)} in`,
  },
};

export function formatAmount({ amount, unit }, factor, system) {
  if (amount === null) return '';
  const scaled = amount * factor;
  const known = UNITS[unit];
  if (known?.family === 'volume' && known.system === system) return `${fraction(scaled)} ${unit === 'cup' && scaled > 1 ? 'cups' : unit}`;
  if (!known) return unit ? `${fraction(scaled)} ${MEASURE_WORDS.has(unit) ? MEASURE_WORDS.get(unit)[scaled === 1 ? 0 : 1] : unit}` : fraction(scaled);
  return SHOW[known.family][system](scaled * known.base);
}

// Reads a leading decimal, fraction or mixed number without consuming ingredient names.
export function readNumber(words) {
  if (!words.length) return null;
  const first = /^\d+(\.\d+)?$/.test(words[0]) ? Number(words[0]) : parseFraction(words[0]);
  if (first === null) return null;
  const second = words.length > 1 ? parseFraction(words[1]) : null;
  const value = second === null ? first : first + second;
  if (!Number.isFinite(value) || value <= 0) throw new Error('quantity must be a positive finite number');
  return { value, words: second === null ? 1 : 2 };
}

function parseFraction(word) {
  const slash = word.match(/^(\d+)\/(\d+)$/);
  if (slash) return Number(slash[1]) / Number(slash[2]);
  const glyph = word.match(/^(\d+)?([½⅓⅔¼¾⅛⅜⅝⅞])$/);
  return glyph ? Number(glyph[1] || 0) + FRACTION_GLYPHS[glyph[2]] : null;
}

// US ovens are marked in 25 °F steps, so 220 °C reads as 425 °F rather than 428.
export function formatOven({ celsius, fan }) {
  return `${roundTo(celsius * 9 / 5 + 32, 25)} °F${fan ? ' convection' : ''}`;
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60), min = minutes % 60;
  return [h && `${h} h`, min && `${min} min`].filter(Boolean).join(' ');
}

// "4:00" or "1:30:00", for timers.
export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const parts = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60];
  if (!parts[0]) parts.shift();
  return parts.map((p, i) => i ? String(p).padStart(2, '0') : String(p)).join(':');
}
