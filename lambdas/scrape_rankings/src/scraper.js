import { loadPage, closeBrowser, currentSeasonYear } from "../../utils/scraper-base";

const url = `https://badmintonplayer.dk/DBF/Ranglister/#287,${currentSeasonYear},,0,,,1095,0,,,,15,,,,0,,,,,,`;
let page = null;

export async function init() {
    page = await loadPage(url);
}
export async function close() {
    await closeBrowser();
}

export async function scrapeRankingInfo() {
    return await page.locator("#PanelResults").evaluate((el) => {
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
        await page.waitForSelector(".rankingstabs");
        const categoryLink = page.locator(".rankingstabs > .smallTab > a").filter({
            hasText: category,
        });

        if ((await categoryLink.count()) > 0) {
            await categoryLink.click();
        }

        const categoryPlayers = await scrapeCategory();

        for (const player of categoryPlayers) {
            if (!players[player.name]) {
                players[player.name] = {
                    level: player.level,
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
        players.push(...(await scrapeRankingTable()));

        const rankingPages = page.locator("table.RankingListGrid tr:last-child > td[colspan] a");
        const rankingPagesCount = await rankingPages.count();

        if (rankingPagesCount === 0) {
            break;
        }
        if (rankingPagesCount > pageIdx) {
            await rankingPages.nth(pageIdx).click();
            pageIdx++;
        } else {
            break;
        }
    }

    return players;
}

async function scrapeRankingTable() {
    const rankingTable = page.locator("table.RankingListGrid");
    await rankingTable.waitFor();
    const names = await rankingTable.locator("tr td.name > a").allInnerTexts();
    const levels = await rankingTable.locator("tr td.clas").allInnerTexts();
    const points = (await rankingTable.locator("tr td.points:not(:last-child)").allInnerTexts()).map((text) =>
        Number(text)
    );
    const players = names.map((name, i) => ({ name, level: levels[i], points: points[i] }));
    return players;
}
