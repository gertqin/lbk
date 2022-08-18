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

const teamDefinition1div = [
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

const teamDefinitionSen = [
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

function createEmptyTeam(teamName, teamDefinition) {
    return {
        name: teamName,
        matches: teamDefinition.map((matchDef) => ({
            name: matchDef.name,
            players: matchDef.categories.map((c) => ({ name: "", category: c })),
        })),
    };
}
function createEmptyTeams() {
    return [
        createEmptyTeam("SEN 1", teamDefinition1div),
        createEmptyTeam("SEN 2", teamDefinitionSen),
        createEmptyTeam("SEN 3", teamDefinitionSen),
        createEmptyTeam("SEN 4", teamDefinitionSen),
    ];
}

const emptyTeams = createEmptyTeams();

const storedTeamsStr = localStorage.getItem("teams");
const storedTeams = storedTeamsStr ? JSON.parse(storedTeamsStr) : [];

const teams = ref(storedTeams.length === emptyTeams.length ? storedTeams : emptyTeams);

watch(
    teams,
    (val) => {
        localStorage.setItem("teams", JSON.stringify(val));
    },
    { deep: true }
);

function getCategoryPoints(player) {
    const points = rankings.value.players[player.name]?.points;
    if (points) {
        return points[player.category] || "-";
    } else {
        return "";
    }
}
function getLevelPoints(player) {
    const points = rankings.value.players[player.name]?.points;
    if (points) {
        return points["NIVEAU"] || "-";
    } else {
        return "";
    }
}
function getTotalPoints(players) {
    let totalPoints = 0;
    for (const player of players) {
        const points = rankings.value.players[player.name]?.points;
        if (points) {
            totalPoints += points[player.category] || points["NIVEAU"] || 0;
        }
    }
    return totalPoints || "";
}

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
                <div v-for="team in teams" class="team">
                    <h2>{{ team.name }}</h2>
                    <table>
                        <tr>
                            <th></th>
                            <th>Spiller</th>
                            <th>Point<br />kategori</th>
                            <th>Point<br />niveau</th>
                            <th>Point<br />samlet</th>
                        </tr>
                        <template v-for="match in team.matches">
                            <tr v-for="(player, i) in match.players">
                                <td v-if="i == 0" :rowspan="match.players.length">{{ match.name }}</td>
                                <td>
                                    <input
                                        :list="isFemaleCategory(player.category) ? 'female-players' : 'male-players'"
                                        v-model="player.name"
                                    />
                                </td>
                                <td>
                                    {{ getCategoryPoints(player) }}
                                </td>
                                <td>
                                    {{ getLevelPoints(player) }}
                                </td>
                                <td v-if="i == 0" :rowspan="match.players.length">
                                    {{ getTotalPoints(match.players) }}
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
    border: none;
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
