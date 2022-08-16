<script setup>
import { ref, shallowRef, computed, watch } from "vue";

const rankings = shallowRef(null);

(async function () {
    const rankingsUrl = "https://nwkg8ye3pg.execute-api.eu-north-1.amazonaws.com/prod";
    const res = await fetch(rankingsUrl);
    const data = await res.json();

    if (data.statusCode === 200) {
        rankings.value = data.body;
    } else {
        alert("Kunne ikke hente rangliste");
    }
})();

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
            categories: matchDef.categories,
            players: matchDef.categories.map((_) => ""),
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

function getPoints(playerName, category) {
    const points = rankings.value.players[playerName]?.points;
    if (points) {
        return points[category] || points["NIVEAU"] || "-";
    } else {
        return "";
    }
}
function getTotalPoints(players, categories) {
    let totalPoints = 0;
    players.forEach((playerName, i) => {
        const points = rankings.value.players[playerName]?.points;
        if (points) {
            totalPoints += points[categories[i]] || points["NIVEAU"] || 0;
        }
    });
    return totalPoints || "";
}

function clearAll() {
    teams.value = createEmptyTeams();
}
</script>

<template>
    <div class="set-teams">
        <h1>Sæt hold</h1>

        <template v-if="rankings">
            <datalist id="female-players">
                <option v-for="player in femalePlayers" :value="player" />
            </datalist>
            <datalist id="male-players">
                <option v-for="player in malePlayers" :value="player" />
            </datalist>

            <div class="info">
                Rangliste senest opdateret d. {{ new Date(rankings.scrapeDate).toLocaleDateString("en-GB") }}
            </div>

            <div class="teams">
                <div v-for="team in teams" class="team">
                    <h2>{{ team.name }}</h2>
                    <table>
                        <tr>
                            <th></th>
                            <th>Spiller</th>
                            <th style="width: 48px">Point</th>
                            <th>Point samlet</th>
                        </tr>
                        <template v-for="match in team.matches">
                            <tr v-for="(category, i) in match.categories">
                                <td v-if="i == 0" :rowspan="match.categories.length">{{ match.name }}</td>
                                <td>
                                    <input
                                        :list="isFemaleCategory(category) ? 'female-players' : 'male-players'"
                                        v-model="match.players[i]"
                                    />
                                </td>
                                <td>
                                    {{ getPoints(match.players[i], category) }}
                                </td>
                                <td v-if="i == 0" :rowspan="match.categories.length">
                                    {{ getTotalPoints(match.players, match.categories) }}
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

.info {
    font-style: italic;
}

.teams {
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
    font-size: 1rem;
    background: #f44336;
    color: white;
    padding: 8px 16px;
    border: none;
    outline: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>
