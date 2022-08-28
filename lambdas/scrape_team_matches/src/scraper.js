import { loadPage, closeBrowser, currentSeasonYear } from "../../utils/scraper-base";

let year = currentSeasonYear;
let page = null;

export async function init() {
    const url = `https://www.badmintonplayer.dk/DBF/HoldTurnering/Stilling/#6,${year},,,,,,1095,`;
    page = await loadPage(url);
}
export async function close() {
    await closeBrowser();
}

export async function scrapeSeason() {
    const seasonName = `${year}/${year + 1}`;

    const season = {
        year,
        name: seasonName,
        ageGroups: {},
    };

    const clubList = page.locator(".clubgrouplist");
    await clubList.waitFor();

    const clubListRows = clubList.locator("tr");

    const ageGroupsData = await clubListRows.evaluateAll((rows) => {
        const ageGroups = [];

        rows.forEach((r, i) => {
            if (r.classList.contains("agegrouprow")) {
                ageGroups.push({
                    name: r.innerText,
                    teams: {},
                });
            } else if (r.classList.contains("grouprow")) {
                const teamName = r.querySelector("td:first-child").innerText;
                const teams = ageGroups[ageGroups.length - 1].teams;
                if (!teams[teamName]) teams[teamName] = [];
                teams[teamName].push({
                    index: i,
                    groupName: r.querySelector("td:last-child").innerText,
                });
            }
        });
        return ageGroups;
    });

    for (const ageGroupData of ageGroupsData) {
        const teamNames = Object.keys(ageGroupData.teams);
        const ageGroup = {
            name: ageGroupData.name,
            teams: {},
        };

        for (const teamName of teamNames) {
            const teamGroups = ageGroupData.teams[teamName];

            const matches = [];
            for (const group of teamGroups) {
                await clubListRows.nth(group.index).locator("a").click();
                const groupMatches = await scrapeTeamGroup(teamName);
                if (group.groupName.startsWith("DMU")) {
                    groupMatches.forEach((match) => (match.isDMU = true));
                }
                matches.push(...groupMatches);

                await page
                    .locator("#ctl00_ContentPlaceHolder1_ShowStandings1_PanelResults a")
                    .filter({
                        hasText: /Vis alle r.kker for .*/,
                    })
                    .click();
            }

            ageGroup.teams[teamName] = {
                name: teamName,
                groups: teamGroups.map((tg) => tg.groupName),
                teamMatches: matches,
            };
            console.log(`Fetched: ${ageGroupData.name} ${teamName}`);
        }

        season.ageGroups[ageGroup.name] = ageGroup;
    }

    return season;
}

async function scrapeTeamGroup(teamName) {
    const groupStandings = page.locator(".groupstandings");
    await groupStandings.waitFor();

    const teamEl = groupStandings
        .locator("tr")
        .filter({ has: page.locator("td.score") })
        .locator("td.team a")
        .filter({ hasText: teamName });

    if ((await teamEl.count()) === 0) return [];

    await teamEl.click();
    return await scrapeMatchList(teamName);
}

async function scrapeMatchList(teamName) {
    const matchListTable = page.locator(".matchlist");
    await matchListTable.waitFor();

    const rows = matchListTable.locator("tr:not(.headerrow)");
    const rowCount = await rows.count();

    const matches = [];
    for (let i = 0; i < rowCount; i++) {
        await rows.nth(i).locator(".matchno a").click();
        matches.push(await scrapeTeamMatch(teamName));

        await page.goBack();
        await matchListTable.waitFor();
    }

    return matches;
}

async function scrapeTeamMatch(teamName) {
    try {
        await page.waitForSelector(".matchinfo");
    } catch (e) {
        console.debug(`url: ${this.page.url()}`);
        throw e;
    }

    const teamMatch = await page.evaluate(
        ({ teamName }) => {
            const readInnerText = (el, selector) => {
                const selectorEl = el.querySelector(selector);
                return (selectorEl && selectorEl.innerText) || null;
            };

            const matchInfoTable = document.querySelector(".matchinfo");

            const rowSelector = (nthChild) => `tr:nth-child(${nthChild}) td.val`;

            const matchId = Number(readInnerText(matchInfoTable, rowSelector(1)));
            const round = Number(readInnerText(matchInfoTable, rowSelector(2)).split(" ")[0]);
            const date = readInnerText(matchInfoTable, rowSelector(3));

            const homeTeamName = readInnerText(matchInfoTable, rowSelector(5) + " a");
            const otherTeamName = readInnerText(matchInfoTable, rowSelector(6) + " a");
            const isHomeTeam = homeTeamName.indexOf(teamName) >= 0;

            let result = readInnerText(matchInfoTable, rowSelector(7))
                .split("-")
                .map((v) => Number(v));
            const pointsStr = readInnerText(matchInfoTable, rowSelector(8));
            let points = (pointsStr && pointsStr.split("-").map((v) => Number(v))) || null;
            if (!isHomeTeam) {
                result = result.reverse();
                points = points && points.reverse();
            }

            const isWalkover = document.querySelectorAll(".matchinfowalkover").length > 0;
            const teamMatch = {
                url: "",
                matchId,
                date,
                round,
                isDMU: false,
                isHomeTeam,
                opponentTeamName: isHomeTeam ? otherTeamName : homeTeamName,
                result,
                points,
                isWalkover,
                matches: [],
            };
            const table = document.querySelector(".matchresultschema");
            if (isWalkover || !table) return teamMatch;

            const queryAll = (el, selector) => {
                const els = el.querySelectorAll(selector);
                const result = [];
                for (const el of els) {
                    result.push(el);
                }
                return result;
            };
            const matchRows = queryAll(table, "tr:not(.toprow)");

            const readMatch = (row) => {
                let discipline = readInnerText(row, "td.discipline");
                let isGoldenSet = false;
                if (!discipline) {
                    discipline = readInnerText(row, "td.goldensetdiscipline");
                    isGoldenSet = !!discipline;
                }

                const playerTd = row.children[isHomeTeam ? 1 : 2];
                const isWinner = playerTd.classList.contains("playerwinner");

                const playerSelector = "div:not(.teamhdr)";
                const players = queryAll(playerTd, playerSelector).map((e) =>
                    e.innerText.replace(" (udl.)", "").replace(" (EU)", "")
                );

                const opponentsTd = row.children[isHomeTeam ? 2 : 1];
                const opponents = queryAll(opponentsTd, playerSelector).map((e) => e.innerText);

                const score = queryAll(row, "td.result")
                    .map((e) => e.innerText)
                    .filter((s) => !!s)
                    .map((s) => {
                        const points = s.split("-").map((s) => Number(s.trim()));
                        return {
                            points: isHomeTeam ? points : points.reverse(),
                        };
                    });
                const lbkMatchPoints = isGoldenSet
                    ? 0
                    : isWinner
                    ? // Won on WO where first set is lost and then opponents withdraw gives two points
                      score.length === 3 || (score.length === 2 && score[0].points[0] < score[0].points[1])
                        ? 2
                        : 3
                    : score.length === 3
                    ? 1
                    : 0;

                const isWO = !!readInnerText(row, "td.wo");

                return {
                    discipline,
                    isWinner,
                    players,
                    opponents,
                    isGoldenSet,
                    lbkMatchPoints,
                    score,
                    isWO,
                };
            };

            for (const row of matchRows) {
                if (row) {
                    if (row.querySelectorAll("td.result").length > 0) {
                        teamMatch.matches.push(readMatch(row));
                    }
                }
            }

            return teamMatch;
        },
        { teamName }
    );
    teamMatch.url = page.url();
    return teamMatch;
}
