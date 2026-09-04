import { chromium, devices } from '@playwright/test';
const OUT = '/tmp/claude-1000/-home-aflesch-contrapt/acdb8df2-d62d-4638-a0b3-a03f0a9af2e7/scratchpad/shots';

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 5'], isMobile: true, hasTouch: true });
const page = await context.newPage();
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: 'Ouvrir le menu' }).click();
await page.getByRole('button', { name: 'Atelier de construction' }).click();

const board = page.getByRole('region', { name: 'Plateau de jeu' });
const renderer = board.getByRole('img', { name: 'Rendu du plateau' });

const before = await renderer.screenshot();

await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
await page.getByRole('button', { name: 'Poutre courte' }).tap();
await board.tap({ position: { x: 160, y: 120 } });
await page.getByRole('button', { name: 'Annuler' }).tap();

// Immediate screenshot (matches the test's timing).
const immediate = await renderer.screenshot();
console.log('immediate equals before:', Buffer.compare(immediate, before) === 0);

// Wait a good while, then screenshot again.
await page.waitForTimeout(1000);
const settled = await renderer.screenshot();
console.log('settled equals before:', Buffer.compare(settled, before) === 0);

const zoom = await page.evaluate(() => document.querySelector('.board-canvas')?.getAttribute('data-camera-zoom'));
console.log('final zoom', zoom);

await page.screenshot({ path: `${OUT}/diag3-settled.png` });
await browser.close();
