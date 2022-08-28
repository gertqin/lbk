import { loadPage, closeBrowser, currentSeasonYear } from "../../utils/scraper-base";

const url = `https://www.badmintonplayer.dk/DBF/HoldTurnering/Stilling/#6,${currentSeasonYear},,,,,,1095,`;
let page = null;

export async function init() {
    page = await loadPage(url);
}
export async function close() {
    await closeBrowser();
}

export async function scrapeSeason() {
    const seasonName = `${currentSeasonYear}/${currentSeasonYear + 1}`;

    const season = {
        year: currentSeasonYear,
        name: seasonName,
        ageGroups: {},
    };

    const clubList = page.locator(".clubgrouplist tr");

    const ageGroupsData = await clubList.evaluateAll((rows) => {
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
                    index: i + 1,
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
                await page.click(`tr:nth-child(${group.index}) a`);
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
    const groupStandings = page.locator(".groupstandings tr");

    const teamIndex = await groupStandings.evaluateAll(
        (rows, { teamName }) =>
            rows
                .map((r, i) => ({ el: r, index: i + 1 }))
                .filter((r) => {
                    const rowInnerText = r.el.innerText;
                    const teamTd = r.el.querySelector(".team");
                    return (
                        teamTd.innerText.indexOf(teamName) >= 0 && rowInnerText.toLowerCase().indexOf("trukket") === -1
                    );
                })
                .map((r) => r.index)[0],
        { teamName }
    );
    if (!teamIndex) return [];

    await page.click(`tr:nth-child(${teamIndex}) td.team a`);
    return await scrapeMatchList(teamName);
}

async function scrapeMatchList(teamName) {
    const matchListTable = page.locator(".matchlist");

    const rows = await matchListTable.locator("tr").evaluateAll((rows) =>
        rows.map((r) => ({
            isMatchRow: !r.classList.contains("headerrow"),
        }))
    );

    const matches = [];
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row.isMatchRow) continue;

        await matchListTable.click(`tr:nth-child(${i + 1}) .matchno a`);
        matches.push(await scrapeTeamMatch(teamName));

        await page.goBack();
        await page.waitForSelector(".matchlist");
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
