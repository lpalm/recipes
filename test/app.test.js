import test from 'node:test';
import assert from 'node:assert/strict';

// Captures the app's HTML and UI events without a browser, layout engine or real device storage.
const element = () => ({
  innerHTML: '', style: { setProperty() {} }, dataset: {}, children: [], listeners: {},
  clientHeight: 800, scrollHeight: 0, offsetHeight: 0,
  addEventListener(name, handler) { this.listeners[name] = handler; },
  replaceWith(input) { this.replacement = input; }, focus() {}, select() {},
});

test('changing portions updates shopping, map and step amounts, including substitutes and instruction quantities', async () => {
  const fixture = `T
portions 8
100 g cream, or {180 g} half-and-half
1300 g sauce, {2} small jars
1/8 tsp spice
1 can beans, {=15 oz} per can
cream + sauce + spice + beans > mix: Add {2 to 3 tbsp} water. Heat for {=5 minutes}.`;
  const storage = new Map([['shopping', 'true']]);
  const nodes = new Map(), events = new Map();
  const node = key => { if (!nodes.has(key)) nodes.set(key, element()); return nodes.get(key); };
  const app = element();
  let html = '', ready;
  const loaded = new Promise(resolve => { ready = resolve; });
  Object.defineProperty(app, 'innerHTML', {
    get: () => html,
    set(value) { html = value; nodes.clear(); if (value.includes('id="search"')) ready(); },
  });
  app.querySelector = selector => node(selector);
  app.querySelectorAll = selector => {
    const attribute = selector.slice(1, -1);
    return [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, 'g'))].map(([, value]) => {
      const button = node(`${selector}/${value}`);
      button.dataset[attribute.slice(5)] = value;
      return button;
    });
  };
  globalThis.document = {
    getElementById: id => id === 'app' ? app : html.includes(`id="${id}"`) ? node(`#${id}`) : null,
    createElement: element, addEventListener() {}, removeEventListener() {},
  };
  globalThis.window = { addEventListener: (name, handler) => events.set(name, handler) };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  globalThis.location = { hash: '#/' };
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
  };
  globalThis.fetch = async url => ({ text: async () => url === 'recipes/index.txt' ? 'sample' : fixture });
  globalThis.setInterval = () => 0;
  await import('../app.js');
  await loaded;

  const navigate = hash => { location.hash = hash; events.get('hashchange')(); };
  const portions = value => {
    node('.portions').listeners.click();
    const input = node('.portions').replacement;
    input.value = String(value);
    input.listeners.change();
  };
  navigate('#/r/sample');
  portions(16);
  assert.equal(storage.get('portions/sample'), '16');
  assert.ok(html.includes('16 portions'));
  assert.ok(html.includes('<b>200 g</b><span>cream</span>'));
  assert.ok(html.includes('<b>200 g</b> cream</span>'));
  assert.ok(html.includes('<b>2.6 kg</b><span>sauce</span>'));
  navigate('#/r/sample/1');
  assert.ok(html.includes('<b>200 g</b><span>cream<i>, or 360 g half-and-half</i>'));
  assert.ok(html.includes('<b>2.6 kg</b><span>sauce<i>, 4 small jars</i>'));
  assert.ok(html.includes('15 oz per can'));
  assert.ok(html.includes('Add 59.16 to 88.74 ml water. Heat for 5 minutes.'));
  assert.doesNotMatch(html, /[{}]/);

  navigate('#/r/sample');
  node('[data-units]/imperial').listeners.click();
  assert.ok(html.includes('<b>¼ tsp</b><span>spice</span>'));
  assert.ok(html.includes('<b>¼ tsp</b> spice</span>'));
  navigate('#/r/sample/1');
  assert.ok(html.includes('<b>¼ tsp</b><span>spice</span>'));
  assert.ok(html.includes('Add 4 to 6 tbsp water. Heat for 5 minutes.'));
  navigate('#/r/sample');
  portions(4);
  navigate('#/r/sample/1');
  assert.ok(html.includes('<b>0.0625 tsp</b><span>spice</span>'));
  assert.ok(html.includes('1 small jars'));
  assert.ok(html.includes('15 oz per can'));
});
