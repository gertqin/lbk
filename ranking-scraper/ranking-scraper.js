import { chromium } from "playwright-chromium";

let browser = null;
let page = null;

export async function scrape(url) {
    if (page == null) {
        await init();
    }
        await page.goto("about:blank");
    await page.goto(url);

    try {
        await page.waitForSelector("#onetrust-reject-all-handler", { timeout: 1000 });
        await page.click("#onetrust-reject-all-handler");
    } catch (e) {}

    try {
        await page.waitForSelector("#anchor_ad", { timeout: 1000 });
        await page.click("#anchor_ad .anchor_close");
    } catch (e) {}

    try {
        await page.screenshot({ path: `data/debug.png` });
    } catch (e) {
        console.error(e);
        page.screenshot({ path: "data/error.png" });
    }
}
export async function close() {
    if (browser != null) {
        await browser.close();
    }
}

async function init() {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
}
