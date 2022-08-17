import { loadPage, closeBrowser } from "../../utils/scraper-base";

// TODO dynamic season
const season = "2022";
const url = `https://badmintonplayer.dk/DBF/Ranglister/#287,${season},,0,,,1095,0,,,,15,,,,0,,,,,,`;
let page = null;

export async function init() {
    page = await loadPage(url);
}
export async function close() {
    await closeBrowser();
}

export async function scrapeRankingInfo() {
    await page.waitForSelector("table.RankingListGrid", { timeout: 1000 });
    return await page.$eval("#PanelResults", (el) => {
        const info = {};
        for (const node of el.childNodes) {
            // text node
            if (node.nodeType === 3) {
                const versionMatch = /\s*Version:(.+)/.exec(node.textContent);
                if (versionMatch && versionMatch.length > 1) {
                    info.version = versionMatch[1];
                }

                const periodMatch = /\s*Periode:(.+)/.exec(node.textContent);
                if (periodMatch && periodMatch.length > 1) {
                    info.period = periodMatch[1];
                }
            }
        }
        return info;
    });
}

export async function scrapePlayers() {
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
