import puppeteer from 'puppeteer';
// Or import puppeteer from 'puppeteer-core';

// Launch the browser and open a new blank page
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Navigate the page to a URL.
await page.goto('file://C:/Users/David/Desktop/tooltips/map-ui/w3c-disclaimer2.html');

// Set screen size.
await page.setViewport({width: 1080, height: 360});

const elements = await page.$('body')
await page.evaluate(() => (document.documentElement.style.background = 'transparent'))
await page.evaluate(() => (document.body.style.border = 'none'))
await elements.screenshot({ path: 'screenshot.png', omitBackground: true })

await browser.close();
