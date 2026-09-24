// Renders the screens on an iPhone-sized WebKit into shots/ for checking layout without a device.
import { webkit, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { startServer } from './serve.mjs';

const out = new URL('../shots/', import.meta.url).pathname;
await mkdir(out, { recursive: true });
const { server, url } = await startServer();
const browser = await webkit.launch();
const context = await browser.newContext({ ...devices['iPhone 15'], colorScheme: 'dark' });
const page = await context.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
const shot = async (name, hash, after) => {
  await page.goto(`${url}#${hash}`);
  await page.waitForSelector('#app > *');
  if (after) await after();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}${name}.png` });
  console.log(name);
};

await shot('library', '/');
await shot('search', '/', () => page.fill('#search', 'garlic'));
await shot('recipe', '/r/aglio-e-olio');
await shot('recipe-map', '/r/aglio-e-olio/map');
await shot('step', '/r/aglio-e-olio/3');
await shot('step-timer', '/r/aglio-e-olio/3', () => page.click('#timer'));
await shot('recipe-progress', '/r/aglio-e-olio/map');
await shot('bolognese', '/r/bolognese/map');
await shot('chicken-step-us', '/r/roast-chicken-thighs', async () => { await page.click('[data-units=imperial]'); await page.goto(`${url}#/r/roast-chicken-thighs/3`); await page.waitForSelector('.stepview'); });
await shot('chicken-map-us', '/r/roast-chicken-thighs/map');
await shot('bolognese-step-6', '/r/bolognese/6');

await browser.close();
server.close();
