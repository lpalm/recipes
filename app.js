// Screens and navigation: library → recipe (list, map) → one step per screen. State lives in localStorage.
import { parseRecipe } from './parser.js';
import { layoutMap } from './map.js';
import { formatAmount, formatOven, formatDuration, clock } from './units.js';

const app = document.getElementById('app');
const MAP_FONT_PX = [11, 18]; // the map shrinks to fit the screen, never grows past a comfortable size
const STEP_SCALE = [0.6, 1.15]; // same for the step text, as a multiple of its base size
const store = {
  get(key, fallback) { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); },
  set(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  remove(key) { localStorage.removeItem(key); },
};
const library = [];
let timers = store.get('timers', []);
let audio = null;
let stepNav = null; // set while a step is shown: direction → move to the neighbouring step
let shownStep = null; // last step shown, so the next one slides in from the right side

const ICON = {
  back: '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  map: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="3" y="14" width="7" height="6" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="0.9em" height="0.9em" fill="currentColor"><path d="M7 4.5v15l12-7.5z"/></svg>',
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Amount and name as two aligned columns; the name spans both when there is no amount.
const quantityHtml = (ingredient, factor, system, withPrep = false) => {
  const amount = formatAmount(ingredient, factor, system);
  const name = esc(ingredient.name) + (withPrep && ingredient.prep ? `<i>, ${esc(ingredient.prep)}</i>` : '');
  return amount ? `<b>${esc(amount)}</b><span>${name}</span>` : `<span class="only">${name}</span>`;
};
const settings = ({ id, recipe }) => {
  const portions = store.get(`portions/${id}`, recipe.portions);
  return { portions, factor: portions / recipe.portions, system: store.get('units', 'metric') };
};

async function loadLibrary() {
  const index = await (await fetch('recipes/index.txt')).text();
  const ids = index.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  const entries = await Promise.all(ids.map(async id => {
    try { return { id, recipe: parseRecipe(await (await fetch(`recipes/${id}.txt`)).text()) }; }
    catch (e) { return { id, error: e.message }; }
  }));
  const title = e => e.recipe ? e.recipe.title : e.id;
  library.push(...entries.sort((a, b) => title(a).localeCompare(title(b))));
}

function route() {
  const parts = location.hash.slice(2).split('/');
  const entry = parts[0] === 'r' && library.find(e => e.id === parts[1]);
  stepNav = null;
  if (entry && entry.recipe) {
    store.set('last', location.hash);
    if (parts[2] && parts[2] !== 'map') return showStep(entry, Number(parts[2]));
    showRecipe(entry);
    if (parts[2] === 'map') document.getElementById('map').scrollIntoView();
    return;
  }
  store.remove('last');
  showLibrary();
}

function showLibrary() {
  keepAwake(false);
  app.innerHTML = `
    <div class="page library">
      <h1 class="title">Recipes</h1>
      <input id="search" type="search" placeholder="Search recipes or ingredients" autocomplete="off">
      <ul class="list" id="list"></ul>
    </div>`;
  const input = document.getElementById('search'), list = document.getElementById('list');
  const category = e => (e.recipe && e.recipe.category) || '';
  const matches = (e, q) => e.id.includes(q) || category(e).toLowerCase().includes(q)
    || (e.recipe && (e.recipe.title.toLowerCase().includes(q) || e.recipe.ingredients.some(i => i.name.toLowerCase().includes(q))));
  const row = e => e.recipe
    ? `<li><a href="#/r/${e.id}"><span class="name">${esc(e.recipe.title)}</span><span class="meta">${e.recipe.steps.length} steps · ${e.recipe.ingredients.length} ingredients</span></a></li>`
    : `<li class="broken">${esc(e.id)}.txt<small>${esc(e.error)}</small></li>`;
  const render = () => {
    const q = input.value.trim().toLowerCase();
    const groups = new Map();
    library.filter(e => !q || matches(e, q)).forEach(e => groups.set(category(e), [...(groups.get(category(e)) || []), e]));
    list.innerHTML = [...groups.keys()].sort((a, b) => a.localeCompare(b))
      .map(key => (key ? `<li class="section">${esc(key)}</li>` : '') + groups.get(key).map(row).join('')).join('') || '<li class="empty">Nothing found</li>';
  };
  input.addEventListener('input', render);
  render();
}

function showRecipe(entry) {
  const { id, recipe } = entry;
  const { portions, factor, system } = settings(entry);
  const current = store.get(`step/${id}`, 0);
  const oven = recipe.steps.map(s => s.oven).find(Boolean);
  keepAwake(true);
  app.innerHTML = `
    <header class="bar"><a class="back" href="#/" aria-label="back">${ICON.back}</a></header>
    <div class="page">
      <h1 class="title">${esc(recipe.title)}</h1>
      ${oven ? `<p class="oven">Oven ${formatOven(oven, system)}</p>` : ''}
      <div class="controls">
        <div class="seg stepper"><button data-portions="-1">−</button><span>${portions} ${portions === 1 ? 'portion' : 'portions'}</span><button data-portions="1">+</button></div>
        <div class="seg"><button data-units="metric" class="${system === 'metric' ? 'on' : ''}">metric</button><button data-units="imperial" class="${system === 'imperial' ? 'on' : ''}">US</button></div>
      </div>
      <ul class="ingredients">${recipe.ingredients.map((i, k) =>
        (i.section && i.section !== (k ? recipe.ingredients[k - 1].section : null) ? `<li class="section">${esc(i.section)}</li>` : '') +
        `<li>${quantityHtml(i, factor, system)}</li>`).join('')}</ul>
      <div class="map" id="map">${mapHtml(entry, factor, system, current)}</div>
    </div>
    <footer class="bar"><a class="big start" href="#/r/${id}/${current || 1}">${current > 1 ? `Continue at step ${current}` : 'Start cooking'}</a></footer>`;
  app.querySelectorAll('[data-portions]').forEach(b => b.addEventListener('click', () => {
    store.set(`portions/${id}`, Math.max(1, portions + Number(b.dataset.portions)));
    route();
  }));
  app.querySelectorAll('[data-units]').forEach(b => b.addEventListener('click', () => { store.set('units', b.dataset.units); route(); }));
  fitMap();
}

function mapHtml({ id, recipe }, factor, system, current) {
  const { colCount, cells } = layoutMap(recipe);
  const html = cells.map(c => {
    const style = `grid-row:${c.row + 1}/span ${c.rowSpan};grid-column:${c.col + 1}/span ${c.colSpan}`;
    const ingredientClass = ['cell', 'ingredient', c.endsGroup && 'ends', c.kind === 'ingredient' && c.colSpan > 1 && 'reaches'].filter(Boolean).join(' ');
    if (c.kind === 'blank') return `<div class="${ingredientClass}" style="${style}"></div>`;
    if (c.kind === 'ingredient') {
      const ingredient = recipe.ingredients[c.index], amount = formatAmount(ingredient, factor, system);
      return `<div class="${ingredientClass}" style="${style}"><span>${amount ? `<b>${esc(amount)}</b> ` : ''}${esc(ingredient.name)}</span></div>`;
    }
    const step = recipe.steps[c.index], n = c.index + 1;
    const classes = ['cell', 'step', n < current && 'done', n === current && 'current', c.merges && 'merges', c.continues && 'continues', c.continued && 'continued'].filter(Boolean).join(' ');
    return `<a class="${classes}" style="${style}" href="#/r/${id}/${n}"><span><i class="n">${n}</i>${esc(step.label)}</span>${step.minutes ? `<small>${formatDuration(step.minutes)}</small>` : ''}</a>`;
  }).join('');
  return `<div class="grid" style="grid-template-columns:fit-content(45%) repeat(${colCount - 1}, auto)">${html}</div>`;
}

// The largest font at which no word overflows its cell and the whole map fits the screen; below the minimum it scrolls.
function fitMap() {
  const grid = app.querySelector('.grid');
  const budget = app.querySelector('.page').clientHeight - 24; // the visible area between the bars, inside the phone's safe areas
  const fits = size => {
    grid.style.fontSize = `${size}px`;
    return grid.offsetHeight <= budget && [...grid.children].every(c => c.scrollWidth <= c.clientWidth + 1);
  };
  let [lo, hi] = MAP_FONT_PX;
  for (let i = 0; i < 6; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  fits(lo);
}

function showStep(entry, n) {
  const { id, recipe } = entry;
  const step = recipe.steps[n - 1];
  if (!step) { location.replace(`#/r/${id}`); return; }
  const { factor, system } = settings(entry);
  const next = recipe.steps[n];
  const gear = [...step.equipment, step.oven && `oven ${formatOven(step.oven, system)}`].filter(Boolean).join(' · ');
  const inputs = step.inputs.map(({ kind, index }) => kind === 'step'
    ? `<li class="from"><b>step ${index + 1}</b><span>${esc(recipe.steps[index].label)}</span></li>`
    : `<li>${quantityHtml(recipe.ingredients[index], factor, system, true)}</li>`).join('');
  const direction = shownStep && shownStep.id === id ? Math.sign(n - shownStep.n) : 0;
  shownStep = { id, n };
  store.set(`step/${id}`, n);
  keepAwake(true);
  stepNav = d => { const to = n + d; if (to >= 1 && to <= recipe.steps.length) location.hash = `#/r/${id}/${to}`; };
  app.innerHTML = `
    <div class="progress"><i style="width:${(n / recipe.steps.length) * 100}%"></i></div>
    <header class="bar"><a class="back" href="#/r/${id}" aria-label="recipe">${ICON.back}</a><span class="count">${n} of ${recipe.steps.length}</span><a class="maplink" href="#/r/${id}/map" aria-label="map">${ICON.map}</a></header>
    <div class="timers" id="timers"></div>
    <main class="stepview ${direction > 0 ? 'enter-next' : direction < 0 ? 'enter-back' : ''}" id="step">
      <p class="label">${esc(step.label)}</p>
      <p class="instruction">${esc(step.instruction)}</p>
      <ul class="inputs">${inputs}</ul>
      ${gear ? `<p class="gear">${esc(gear)}</p>` : ''}
      ${step.minutes ? `<button class="big timer" id="timer" data-timer-for="${id}/${n}" data-total="${step.minutes * 60}"></button>` : ''}
    </main>
    <footer class="bar next">${next
      ? `<a class="big" href="#/r/${id}/${n + 1}"><span class="muted">Next</span>${esc(next.label)}</a>`
      : `<a class="big done" id="done" href="#/r/${id}">Done</a>`}</footer>`;
  document.getElementById('step').addEventListener('click', e => {
    if (e.target.closest('button, a')) return;
    stepNav(e.clientX < window.innerWidth * 0.4 ? -1 : 1);
  });
  const done = document.getElementById('done');
  if (done) done.addEventListener('click', () => store.remove(`step/${id}`));
  const timer = document.getElementById('timer');
  if (timer) timer.addEventListener('click', () => {
    const key = timer.dataset.timerFor;
    if (timers.some(t => t.key === key)) dismissTimer(key);
    else startTimer(key, step);
    refit();
  });
  tick();
  fitStep();
}

// The largest text scale at which the step fits without scrolling.
function fitStep() {
  const main = document.getElementById('step');
  const fits = scale => { main.style.setProperty('--scale', scale); return main.scrollHeight <= main.clientHeight + 1; };
  let [lo, hi] = STEP_SCALE;
  for (let i = 0; i < 7; i++) { const mid = (lo + hi) / 2; if (fits(mid)) lo = mid; else hi = mid; }
  fits(lo);
}

function startTimer(key, step) {
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  audio.resume();
  timers.push({ key, label: step.label, endsAt: Date.now() + step.minutes * 60000 });
  store.set('timers', timers);
  tick();
}

function dismissTimer(key) {
  timers = timers.filter(t => t.key !== key);
  store.set('timers', timers);
  tick();
}

// The timer bar above the step grows and shrinks with the timers, so the step text is refitted around it.
function refit() {
  if (document.getElementById('step')) fitStep();
  if (app.querySelector('.grid')) fitMap();
}

function tick() {
  const now = Date.now();
  const box = document.getElementById('timers');
  if (box) box.innerHTML = timers.map(t => `<button class="timerbar${t.endsAt <= now ? ' rang' : ''}" data-timer="${esc(t.key)}">${esc(t.label)} · ${t.endsAt <= now ? 'done' : clock((t.endsAt - now) / 1000)}</button>`).join('');
  const button = document.getElementById('timer');
  if (button) {
    const running = timers.find(t => t.key === button.dataset.timerFor);
    button.classList.toggle('running', Boolean(running));
    button.innerHTML = running ? (running.endsAt <= now ? 'done' : clock((running.endsAt - now) / 1000)) : `${ICON.play} ${clock(Number(button.dataset.total))}`;
  }
  if (audio && timers.some(t => t.endsAt <= now)) beep();
}

function beep() {
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.frequency.value = 880;
  gain.gain.value = 0.3;
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + 0.25);
}

let wakeLock = null, wantAwake = false;
async function keepAwake(on) {
  wantAwake = on;
  if (on && !wakeLock && navigator.wakeLock) {
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* refused while hidden; requested again when visible */ }
  }
  if (!on && wakeLock) wakeLock.release();
}

let touchStart = null;
app.addEventListener('touchstart', e => { touchStart = e.touches[0]; }, { passive: true });
app.addEventListener('touchend', e => {
  if (!touchStart || !stepNav) return;
  const dx = e.changedTouches[0].clientX - touchStart.clientX, dy = e.changedTouches[0].clientY - touchStart.clientY;
  if (Math.abs(dx) > 60 && Math.abs(dy) < 40) stepNav(dx < 0 ? 1 : -1);
}, { passive: true });
app.addEventListener('click', e => {
  const bar = e.target.closest('[data-timer]');
  if (bar) { dismissTimer(bar.dataset.timer); refit(); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wantAwake) keepAwake(true); });
window.addEventListener('hashchange', route);
window.addEventListener('resize', refit);
setInterval(tick, 1000);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
loadLibrary().then(() => {
  const last = store.get('last', null);
  if (!location.hash && last) location.replace(last);
  route();
}).catch(e => { app.innerHTML = `<p class="error">Could not load the recipes: ${esc(e.message)}</p>`; });
