import awsChromium from "@sparticuz/chrome-aws-lambda";
import { chromium } from "playwright-core";

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
    } catch (e) {
        console.warn("No cookie popup");
    }

    try {
        await page.waitForSelector("#anchor_ad", { timeout: 200 });
        await page.click("#anchor_ad .anchor_close");
    } catch (e) {
        console.warn("No anchor ad");
    }

    const players = await scrapeCategories();
    return players;
}

export async function close() {
    if (browser != null) {
        await browser.close();
    }
}

async function init() {
    const executablePath = await awsChromium.executablePath;
    const launchOptions = executablePath
        ? {
              args: awsChromium.args,
              executablePath,
              headless: awsChromium.headless,
          }
        : {};

    browser = await chromium.launch(launchOptions);
    const context = await browser.newContext();
    page = await context.newPage();
}

async function scrapeCategories() {
    const categories = ["NIVEAU", "HS", "DS", "HD", "DD", "MD H", "MD D"];

    const players = {};

    for (const category of categories) {
        await page.waitForSelector(".rankingstabs", { timeout: 1000 });

        const categoryLinks = await page.$$(".rankingstabs > .smallTab > a");
        for (const link of categoryLinks) {
            if ((await link.innerText()) === category) {
                await link.click();
            }
        }

        const categoryPlayers = await scrapeCategory();

        for (const player of categoryPlayers) {
            if (!players[player.name]) {
                players[player.name] = {
                    points: {},
                };
            }

            players[player.name].points[category] = player.points;
        }
    }
    return players;
}

async function scrapeCategory() {
    const players = [];

    let pageIdx = 0;
    while (true) {
        await page.waitForSelector("table.RankingListGrid", { timeout: 1000 });
        players.push(...(await scrapeRankingTable()));

        const rankingPagesEl = await page.$("table.RankingListGrid tr:last-child > td[colspan]");

        if (!rankingPagesEl) {
            break;
        }
        const linkPages = await rankingPagesEl.$$("a");

        if (linkPages.length > pageIdx) {
            await linkPages[pageIdx].click();
            pageIdx++;
        } else {
            break;
        }
    }

    return players;
}

async function scrapeRankingTable() {
    const rankingTable = await page.$("table.RankingListGrid");
    const names = await rankingTable.$$eval("tr > td.name > a", (els) => els.map((el) => el.innerText));
    const points = await rankingTable.$$eval("tr > td.points:not(:last-child)", (els) =>
        els.map((el) => Number(el.innerText))
    );

    const players = names.map((name, i) => ({ name, points: points[i] }));
    return players;
}
