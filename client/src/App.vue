<script setup>
import SetTeams from "./SetTeams.vue";
</script>

<template>
    <header class="header">LBK</header>
    <SetTeams />
</template>

<style>
body {
    margin: 0;
}

#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin-top: 64px;
    padding: 0 16px 16px;
}
</style>

<style scoped>
.header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;

    background: #43a047;
    color: white;

    padding: 0 32px;

    display: flex;
    align-items: center;
    font-size: 32px;
    font-weight: bold;
}
</style>
