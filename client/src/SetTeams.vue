<script setup>
import { ref, shallowRef, computed, watch } from "vue";

const versions = shallowRef(null);
const selectedVersion = ref(null);
const rankings = shallowRef(null);

async function loadRankings(version) {
    rankings.value = null;

    const rankingsUrl =
        "https://nwkg8ye3pg.execute-api.eu-north-1.amazonaws.com/prod" + (version ? "?version=" + version : "");
    const res = await fetch(rankingsUrl);
    const data = await res.json();

    if (data.statusCode === 200) {
        if (data.body.versions) {
            versions.value = data.body.versions;
            selectedVersion.value = versions.value[0];
        }

        if (data.body.rankings.version === selectedVersion.value) {
            rankings.value = data.body.rankings;
        }
    } else {
        alert("Kunne ikke hente rangliste");
    }
}
loadRankings();

watch(selectedVersion, (val, oldVal) => {
    if (oldVal && val !== oldVal) {
        loadRankings(val);
    }
});

const playerNames = computed(() => {
    return rankings.value ? Object.keys(rankings.value.players) : [];
});

function isFemaleCategory(category) {
    return ["MD D", "DS", "DD"].includes(category);
}
function isMaleCategory(category) {
    return ["MD H", "HS", "HD"].includes(category);
}

// handle players only having points in NIVEAU
const femaleNames = ["Pia", "Malene", "Maria", "Karen"];
const maleNames = ["Gert", "Claus", "Alexander", "Gustav", "Laurids", "Matti"];

const femalePlayers = computed(() => {
    return playerNames.value.filter(
        (name) =>
            femaleNames.some((n) => name.startsWith(n)) ||
            Object.keys(rankings.value.players[name].points).some((c) => isFemaleCategory(c))
    );
});
const malePlayers = computed(() => {
    return playerNames.value.filter(
        (name) =>
            maleNames.some((n) => name.startsWith(n)) ||
            Object.keys(rankings.value.players[name].points).some((c) => isMaleCategory(c))
    );
});

const matchesDefinition1div = [
    { name: "1. MD", categories: ["MD D", "MD H"] },
    { name: "2. MD", categories: ["MD D", "MD H"] },
    { name: "1. DS", categories: ["DS"] },
    { name: "2. DS", categories: ["DS"] },
    { name: "1. HS", categories: ["HS"] },
    { name: "2. HS", categories: ["HS"] },
    { name: "1. DD", categories: ["DD", "DD"] },
    { name: "1. HD", categories: ["HD", "HD"] },
    { name: "2. HD", categories: ["HD", "HD"] },
];

const matchesDefinitionSen = [
    { name: "1. MD", categories: ["MD D", "MD H"] },
    { name: "2. MD", categories: ["MD D", "MD H"] },
    { name: "1. DS", categories: ["DS"] },
    { name: "2. DS", categories: ["DS"] },
    { name: "1. HS", categories: ["HS"] },
    { name: "2. HS", categories: ["HS"] },
    { name: "3. HS", categories: ["HS"] },
    { name: "4. HS", categories: ["HS"] },
    { name: "1. DD", categories: ["DD", "DD"] },
    { name: "2. DD", categories: ["DD", "DD"] },
    { name: "1. HD", categories: ["HD", "HD"] },
    { name: "2. HD", categories: ["HD", "HD"] },
    { name: "3. HD", categories: ["HD", "HD"] },
];

const teamDefinitions = [
    { name: "SEN 1", matches: matchesDefinition1div },
    { name: "SEN 2", matches: matchesDefinitionSen },
    { name: "SEN 3", matches: matchesDefinitionSen },
    { name: "SEN 4", matches: matchesDefinitionSen },
];

function createEmptyTeams() {
    return teamDefinitions.map((def) => def.matches.map((match) => match.categories.map((_) => "")));
}

const storedTeamsStr = localStorage.getItem("teams");
const storedTeams = storedTeamsStr ? JSON.parse(storedTeamsStr) : [];

const teamPlayers = ref(storedTeams.length === teamDefinitions.length ? storedTeams : createEmptyTeams());

watch(
    teamPlayers,
    (val) => {
        localStorage.setItem("teams", JSON.stringify(val));
    },
    { deep: true }
);

const detailedTeams = computed(() => {
    const teams = teamDefinitions.map((def, defIdx) => ({
        name: def.name,
        isFirstDiv: def.matches === matchesDefinition1div,
        matches: def.matches.map((match, matchIdx) => {
            const detailedMatch = {
                name: match.name,
                players: match.categories.map((category, categoryIdx) => {
                    const playerName = teamPlayers.value[defIdx][matchIdx][categoryIdx];
                    const points = rankings.value.players[playerName]?.points;
                    return {
                        name: playerName,
                        category,
                        categoryPoints: points ? points[category] : 0,
                        levelPoints: points ? points["NIVEAU"] : 0,
                    };
                }),
            };
            detailedMatch.totalPoints = detailedMatch.players.reduce(
                (sum, player) => sum + (player.categoryPoints || player.levelPoints || 0),
                0
            );

            return detailedMatch;
        }),
    }));

    // validate categories inside team
    teams.forEach((team) => {
        team.matches.forEach((match, matchIdx) => {
            for (const prevMatch of team.matches.slice(0, matchIdx)) {
                const getMatchCategory = (m) => m.name.substring(m.name.length - 2);

                const sameCategory = getMatchCategory(match) === getMatchCategory(prevMatch);

                const isSingle = match.players.length === 1;
                const pointThreshold = isSingle ? 50 : 100;
                const rule = `§ 38 stk. ${isSingle ? 2 : 3}`;

                const pointDif = match.totalPoints - prevMatch.totalPoints;
                if (sameCategory && pointDif > pointThreshold) {
                    match.illegal = true;
                    match.illegalReason = `${prevMatch.name} har ${pointDif} (>${pointThreshold}) færre point (${rule})`;
                    break;
                }
            }
        });
    });

    // validate players across teams
    teams.forEach((team, teamIdx) => {
        for (const prevTeam of teams.slice(0, teamIdx)) {
            for (const match of team.matches) {
                for (const player of match.players) {
                    if (player.illegal) continue;

                    const playerPoints = rankings.value.players[player.name]?.points;
                    if (!playerPoints) continue;

                    if (prevTeam.isFirstDiv) {
                        // special rules for 1div teams
                        const rule = `§ 38 stk. 5`;

                        // obj of same sex players with list of categories
                        const prevPlayers = {};
                        for (const prevMatch of prevTeam.matches) {
                            for (const prevPlayer of prevMatch.players) {
                                if (!rankings.value.players[prevPlayer.name]) continue;

                                if (isFemaleCategory(player.category) !== isFemaleCategory(prevPlayer.category))
                                    continue;

                                if (!prevPlayers[prevPlayer.name]) {
                                    prevPlayers[prevPlayer.name] = {
                                        name: prevPlayer.name,
                                        categories: [],
                                    };
                                }
                                prevPlayers[prevPlayer.name].categories.push({
                                    name: prevPlayer.category,
                                    points: prevPlayer.categoryPoints || prevPlayer.levelPoints,
                                });
                            }
                        }

                        // compare all categories of prevPlayer - at least one must be within 50points
                        for (const prevPlayer of Object.values(prevPlayers)) {
                            // points over threshold for all categories -> illegal
                            if (
                                prevPlayer.categories.every(
                                    (c) => (playerPoints[c.name] || playerPoints["NIVEAU"] || 0) - c.points > 50
                                )
                            ) {
                                player.illegal = true;

                                const categoryDifs = prevPlayer.categories
                                    .map(
                                        (c) =>
                                            `${c.name}: ${(playerPoints[c.name] || playerPoints["NIVEAU"]) - c.points}`
                                    )
                                    .join(", ");
                                player.illegalReason = `${prevPlayer.name} (${prevTeam.name}) har færre end 50 points i alle spillende kategorier (${categoryDifs}) (${rule})`;
                                break;
                            }
                        }
                    } else {
                        // rules for other teams
                        const rule = `§ 38 stk. 4`;

                        // only compare with players playing same two category, i.e. ignore DD and HD
                        if (player.category === "DD" || player.category === "HD") continue;

                        const prevPlayers = prevTeam.matches.reduce((arr, match) => {
                            arr.push(...match.players.filter((p) => p.category === player.category && p.levelPoints));
                            return arr;
                        }, []);

                        const illegalReasonPlayer = prevPlayers.find((p2) => player.levelPoints - p2.levelPoints > 50);

                        if (illegalReasonPlayer) {
                            player.illegalLevel = true;
                            player.illegalLevelReason = `${illegalReasonPlayer.name} (${prevTeam.name}) har ${
                                player.levelPoints - illegalReasonPlayer.levelPoints
                            } (>50) færre NIVEAU point og spiller samme kategorier (${rule})`;
                            break;
                        }
                    }
                }
            }
        }
    });

    return teams;
});

function clearAll() {
    teams.value = createEmptyTeams();
}
</script>

<template>
    <div class="set-teams">
        <h1>Sæt hold</h1>

        <div v-if="versions">
            Ranglisteversion:
            <select v-model="selectedVersion">
                <option v-for="version in versions" :value="version">{{ version }}</option>
            </select>
        </div>

        <template v-if="rankings">
            <datalist id="female-players">
                <option v-for="player in femalePlayers" :value="player" />
            </datalist>
            <datalist id="male-players">
                <option v-for="player in malePlayers" :value="player" />
            </datalist>

            <div style="margin-top: 8px">Periode: {{ rankings.period }}</div>

            <div class="teams">
                <div v-for="(team, teamIdx) in detailedTeams" class="team">
                    <h2>{{ team.name }}</h2>
                    <table>
                        <tr>
                            <th></th>
                            <th>Spiller</th>
                            <th>Point<br />kategori</th>
                            <th>Point<br />niveau</th>
                            <th>Point<br />samlet</th>
                        </tr>
                        <template v-for="(match, matchIdx) in team.matches">
                            <tr
                                v-for="(player, i) in match.players"
                                :class="{ illegal: match.illegal || player.illegal || player.illegalLevel }"
                            >
                                <td v-if="i == 0" :rowspan="match.players.length">{{ match.name }}</td>
                                <td>
                                    <input
                                        :list="isFemaleCategory(player.category) ? 'female-players' : 'male-players'"
                                        v-model="teamPlayers[teamIdx][matchIdx][i]"
                                    />
                                </td>
                                <td
                                    v-if="player.categoryPoints"
                                    :class="{ 'illegal-points': player.illegal }"
                                    :title="player.illegalReason"
                                >
                                    {{ player.categoryPoints }}{{ player.illegal ? "!" : "" }}
                                </td>
                                <td v-else>
                                    {{ player.levelPoints ? "-" : "" }}
                                </td>
                                <td
                                    :class="{ 'illegal-points': player.illegal || player.illegalLevel }"
                                    :title="player.illegalLevelReason || player.illegalReason"
                                >
                                    {{ player.levelPoints || "" }}{{ player.illegal || player.illegalLevel ? "!" : "" }}
                                </td>
                                <td
                                    v-if="i == 0"
                                    :rowspan="match.players.length"
                                    :class="{ 'illegal-points': match.illegal }"
                                    :title="match.illegalReason"
                                >
                                    {{ match.totalPoints || "" }}{{ match.illegal ? "!" : "" }}
                                </td>
                            </tr>
                        </template>
                    </table>
                </div>
            </div>

            <button @click="clearAll" class="clear-button">Ryd alle</button>
        </template>
    </div>
</template>

<style scoped>
.set-teams {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-bottom: 16px;
}

.teams {
    font-size: 1.4rem;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    margin-left: -16px;
}

.team {
    margin-left: 16px;
}

.team :deep(h2) {
    margin-bottom: 0;
}
.team :deep(table) {
    border-spacing: 0;
    border-collapse: collapse;
}
.team :deep(th),
.team :deep(td) {
    border: 1px solid #aaa;
    padding: 2px 4px;
    text-align: left;
}

.team :deep(input) {
    background: transparent;
    border: none;
}

.illegal {
    background: #ffd2d2;
}
.illegal-points {
    font-weight: bold;
    text-decoration: underline;
    text-decoration-style: dotted;
}

.clear-button {
    margin-top: 16px;
    font-size: 1.6rem;
    background: #f44336;
    color: white;
    padding: 8px 16px;
    border: none;
    outline: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>
