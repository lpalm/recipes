// Recipe prose distinguishes scalable quantities from explicitly fixed measurements.
import { formatAmount, normalizeUnit, readNumber } from './units.js';

const UNMARKED_NUMBER = /\d|[½⅓⅔¼¾⅛⅜⅝⅞]|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|dozen|both|half|quarter|third)\b/i;

export function parseText(text, at = 'text') {
  return text.split(/(\{[^{}]*\})/).filter(Boolean).map(part => {
    if (!part.startsWith('{') || !part.endsWith('}')) {
      if (/[{}]/.test(part)) throw new Error(`${at}: malformed quantity annotation`);
      if (UNMARKED_NUMBER.test(part.replace(/\bhalf-and-half\b/gi, ''))) throw new Error(`${at}: unmarked quantity in "${part.trim()}"; use {amount unit} to scale or {=text} to keep fixed`);
      return part;
    }
    const value = part.slice(1, -1).trim();
    if (value.startsWith('=')) {
      if (!value.slice(1).trim()) throw new Error(`${at}: empty fixed text`);
      return { fixed: value.slice(1).trim() };
    }
    const words = value.split(/\s+/);
    const amount = readNumber(words);
    if (!amount) throw new Error(`${at}: invalid quantity "${value}"`);
    words.splice(0, amount.words);
    let max = null;
    if (words[0] === 'to') {
      words.shift();
      const end = readNumber(words);
      if (!end || end.value < amount.value) throw new Error(`${at}: invalid quantity range "${value}"`);
      max = end.value;
      words.splice(0, end.words);
    }
    const unit = words.length ? normalizeUnit(words[0]) : null;
    if (words.length > 1 || (words.length && !unit)) throw new Error(`${at}: unknown quantity unit in "${value}"`);
    return { amount: amount.value, unit, max };
  });
}

export function formatText(text, factor, system) {
  return parseText(text).map(part => {
    if (typeof part === 'string') return part;
    if ('fixed' in part) return part.fixed;
    const first = formatAmount(part, factor, system);
    if (part.max === null) return first;
    const last = formatAmount({ amount: part.max, unit: part.unit }, factor, system);
    const space = first.lastIndexOf(' ');
    return `${space >= 0 && first.slice(space) === last.slice(last.lastIndexOf(' ')) ? first.slice(0, space) : first} to ${last}`;
  }).join('');
}
