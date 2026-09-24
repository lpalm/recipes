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
await shot('recipe', '/r/garlic-lemon-butter-salmon');
await shot('recipe-map', '/r/garlic-lemon-butter-salmon/map');
await shot('step', '/r/garlic-lemon-butter-salmon/2');
await shot('step-timer', '/r/garlic-lemon-butter-salmon/2', () => page.click('#timer'));
await shot('recipe-progress', '/r/garlic-lemon-butter-salmon/map');
await shot('big-map', '/r/rigatoni-bolognese/map');
await shot('oven-step-us', '/r/pork-tenderloin-chimichurri', async () => { await page.click('[data-units=imperial]'); await page.goto(`${url}#/r/pork-tenderloin-chimichurri/3`); await page.waitForSelector('.stepview'); });
await shot('oven-map-us', '/r/pork-tenderloin-chimichurri/map');
await shot('long-step', '/r/rigatoni-bolognese/6');

await browser.close();
server.close();
