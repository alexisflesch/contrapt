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

const dump = async (label) => {
  const info = await page.evaluate(() => {
    const canvas = document.querySelector('.board-canvas');
    const frame = document.querySelector('.scene-frame');
    const row = document.querySelector('.board-scene-row');
    const r = (el) => el ? el.getBoundingClientRect() : null;
    return {
      zoom: canvas?.getAttribute('data-camera-zoom'),
      canvasRect: r(canvas),
      frameRect: r(frame),
      rowRect: r(row),
    };
  });
  console.log(label, JSON.stringify(info));
  await page.screenshot({ path: `${OUT}/diag2-${label}.png` });
};

await dump('0-initial');

await page.getByRole('button', { name: 'Ouvrir le catalogue' }).tap();
await dump('1-catalogue-open');

await page.getByRole('button', { name: 'Poutre courte' }).tap();
await dump('2-beam-selected');

const boardBox = await board.boundingBox();
console.log('boardBox', JSON.stringify(boardBox));
await board.tap({ position: { x: 160, y: 120 } });
await dump('3-after-tap');

await page.getByRole('button', { name: 'Annuler' }).tap();
await dump('4-after-undo');

await browser.close();
