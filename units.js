// Scales quantities to the chosen portions and shows them in metric or US units; units of the other system are converted.

const UNITS = {
  g: { family: 'weight', system: 'metric', base: 1 }, kg: { family: 'weight', system: 'metric', base: 1000 },
  oz: { family: 'weight', system: 'imperial', base: 28.35 }, lb: { family: 'weight', system: 'imperial', base: 453.6 },
  ml: { family: 'volume', system: 'metric', base: 1 }, l: { family: 'volume', system: 'metric', base: 1000 },
  tsp: { family: 'volume', system: 'imperial', base: 4.93 }, tbsp: { family: 'volume', system: 'imperial', base: 14.79 },
  cup: { family: 'volume', system: 'imperial', base: 236.6 },
  cm: { family: 'length', system: 'metric', base: 1 }, in: { family: 'length', system: 'imperial', base: 2.54 },
};
const ALIASES = { cups: 'cup', lbs: 'lb', inch: 'in', inches: 'in' };
// Words that count rather than measure; shown as written.
const MEASURE_WORDS = new Set(['pinch', 'pinches', 'handful', 'handfuls', 'clove', 'cloves', 'can', 'cans', 'slice', 'slices',
  'bunch', 'bunches', 'sprig', 'sprigs', 'stick', 'sticks', 'stalk', 'stalks', 'head', 'heads', 'piece', 'pieces', 'leaf', 'leaves',
  'sheet', 'sheets', 'knob', 'knobs', 'dash', 'dashes', 'drop', 'drops', 'splash', 'portion', 'portions', 'scoop', 'scoops',
  'packet', 'packets', 'bag', 'bags', 'cube', 'cubes', 'block', 'blocks', 'pack', 'packs', 'bottle', 'bottles', 'fillet', 'fillets',
  'ball', 'balls', 'tin', 'tins', 'jar', 'jars', 'tube', 'tubes']);
const GLYPHS = [[1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'], [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞']];
const CUP_STEPS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];

export function normalizeUnit(word) {
  if (word in UNITS) return word;
  if (word in ALIASES) return ALIASES[word];
  return MEASURE_WORDS.has(word) ? word : null;
}

const trim = (x, decimals) => String(Number(x.toFixed(decimals)));
const roundTo = (x, step) => Number((Math.round(x / step) * step).toFixed(4));

// Whole numbers, kitchen fractions (1½, ⅓) or one decimal when nothing is close.
export function fraction(x) {
  const whole = Math.floor(x + 0.03);
  const rest = x - whole;
  if (rest < 0.03) return String(whole);
  const glyph = GLYPHS.find(([value]) => Math.abs(value - rest) < 0.03);
  return glyph ? `${whole || ''}${glyph[1]}` : trim(x, 1);
}

// Converted amounts round to kitchen steps (a cup is 240 ml, not 237); amounts written in the system stay as written.
const roundConverted = (x, steps) => roundTo(x, steps.find(([limit]) => x < limit)[1]);
const METRIC_WEIGHT_STEPS = [[20, 1], [Infinity, 5]];
const METRIC_VOLUME_STEPS = [[10, 0.5], [100, 5], [Infinity, 10]];

function cups(ml) {
  const raw = ml / UNITS.cup.base;
  const whole = Math.floor(raw);
  const step = CUP_STEPS.reduce((best, s) => Math.abs(whole + s - raw) < Math.abs(whole + best - raw) ? s : best, 0);
  const value = whole + step;
  return `${fraction(value)} ${value > 1 ? 'cups' : 'cup'}`;
}

// Spices are weighed in fractions of a gram; those stay in grams even in US mode, where an ounce would round to nothing.
const grams = (g, converted) => g >= 1000 ? `${trim(g / 1000, 2)} kg` : g < 10 ? `${trim(g, 2)} g` : `${converted ? roundConverted(g, METRIC_WEIGHT_STEPS) : Math.round(g)} g`;
const SHOW = {
  weight: {
    metric: grams,
    imperial: g => { const oz = g / UNITS.oz.base; return oz < 0.125 ? grams(g, false) : oz < 16 ? `${trim(oz, 1)} oz` : `${trim(oz / 16, 1)} lb`; },
  },
  volume: {
    metric: (ml, converted) => ml >= 1000 ? `${trim(ml / 1000, 2)} l` : `${converted ? roundConverted(ml, METRIC_VOLUME_STEPS) : trim(ml, 1)} ml`,
    imperial: ml => ml >= 55 ? cups(ml) : ml >= 14 ? `${fraction(roundTo(ml / UNITS.tbsp.base, 0.5))} tbsp` : `${fraction(roundTo(ml / UNITS.tsp.base, 0.25))} tsp`,
  },
  length: {
    metric: cm => `${trim(cm, 1)} cm`,
    imperial: cm => `${fraction(roundTo(cm / UNITS.in.base, 0.25))} in`,
  },
};

export function formatAmount({ amount, unit }, factor, system) {
  if (amount === null) return '';
  const scaled = amount * factor;
  const known = UNITS[unit];
  if (!known) return unit ? `${fraction(scaled)} ${unit}` : fraction(scaled);
  return SHOW[known.family][system](scaled * known.base, known.system !== system);
}

// US ovens are marked in 25 °F steps, so 220 °C reads as 425 °F rather than 428.
export function formatOven({ celsius, fan }, system) {
  const value = system === 'imperial' ? `${roundTo(celsius * 9 / 5 + 32, 25)} °F` : `${roundTo(celsius, 5)} °C`;
  return value + (fan ? (system === 'imperial' ? ' convection' : ' fan') : '');
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
