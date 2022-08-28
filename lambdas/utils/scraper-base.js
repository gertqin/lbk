import awsChromium from "@sparticuz/chrome-aws-lambda";
import { chromium } from "playwright-core";

let browser = null;

export async function loadPage(url) {
    await initBrowser();

    const context = await browser.newContext();
    context.setDefaultTimeout(8000);
    page = await context.newPage();

    await page.goto("about:blank");
    await page.goto(url);

    try {
        await page.waitForSelector("#onetrust-reject-all-handler", { timeout: 1000 });
        await page.click("#onetrust-reject-all-handler");
    } catch (e) {
        console.warn("No cookie popup");
    }

    try {
        await page.waitForSelector("#anchor_ad", { timeout: 200 });
        await page.click("#anchor_ad .anchor_close");
    } catch (e) {
        console.warn("No anchor ad");
    }

    return page;
}

export async function closeBrowser() {
    if (browser != null) {
        await browser.close();
    }
}

async function initBrowser() {
    const executablePath = await awsChromium.executablePath;
    const launchOptions = executablePath
        ? {
              args: awsChromium.args,
              executablePath,
              headless: awsChromium.headless,
          }
        : {};

    browser = await chromium.launch(launchOptions);
}

export const startSeasonYear = 2011;
export const currentSeasonYear = new Date().getFullYear() - (new Date().getMonth() < 7 ? 1 : 0);
