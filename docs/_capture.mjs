// One-shot script to capture marketing screenshots for the README.
// Uses puppeteer-core with the system Chrome installation.
import puppeteer from 'puppeteer-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME =
  process.env.CHROME_PATH ||
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const URL_BASE = process.env.APP_URL || 'http://127.0.0.1:5173';
const VIEWPORT = { width: 480, height: 1000, deviceScaleFactor: 2 };

const MOCK_NOTES = [
  {
    id: 'demo_1',
    title: 'Pick up groceries after work',
    cleanedText: "Pick up groceries after work — milk, eggs, and the bread Sarah likes from the bakery on Main Street.",
    summary: 'Grocery run on the way home.',
    tags: ['groceries', 'errands', 'sarah'],
    mood: 'focused',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    transcriptionLatencyMs: 1820,
  },
  {
    id: 'demo_2',
    title: 'Email design team about the new landing page',
    cleanedText: 'Email the design team about the new landing page mockups before EOD. The hero section needs a stronger headline.',
    tags: ['email', 'design', 'landing'],
    mood: 'focused',
    timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo_3',
    title: "Mom's birthday is next Friday",
    cleanedText: "Mom's birthday is next Friday — book the restaurant and order the cake by Tuesday.",
    tags: ['family', 'birthday'],
    mood: 'happy',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

async function killAnimations(page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;}',
  });
}

async function shoot(browser, name, setup, ...args) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(URL_BASE, { waitUntil: 'networkidle2' });
  await page.evaluate(setup || (() => {}), ...args);
  await page.reload({ waitUntil: 'networkidle2' });
  await killAnimations(page);
  await new Promise((r) => setTimeout(r, 600));
  const outPath = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`wrote ${outPath}`);
  await page.close();
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
});

await shoot(browser, 'screen-idle', () => {
  localStorage.clear();
});

await shoot(browser, 'screen-driving', () => {
  localStorage.clear();
  localStorage.setItem('drivemind:drivingMode', 'true');
  localStorage.setItem('drivemind:autoListen', 'true');
  localStorage.setItem('drivemind:wakePhrase', 'true');
});

await shoot(browser, 'screen-notes', (mockNotes) => {
  localStorage.clear();
  localStorage.setItem('driveMindNotes', JSON.stringify(mockNotes));
}, MOCK_NOTES);

await browser.close();
console.log('done');
