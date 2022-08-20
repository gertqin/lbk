<script setup>
import SetTeams from "./SetTeams.vue";
</script>

<template>
    <header class="header">LBK Kampe</header>
    <SetTeams />
</template>

<style>
html {
    font-size: 10px;
}
body {
    margin: 0;
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
    margin-top: 64px;
    padding: 0 16px 16px;
    font-size: 1.6rem;
}
h1 {
    font-size: 3.2rem;
}
h2 {
    font-size: 2.4rem;
}

.v-popper__popper {
    font-size: 1.4rem;
}
.v-popper__inner {
    max-width: 300px;
    background: #333 !important;
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
    font-size: 3.2rem;
    font-weight: bold;
}
</style>
