import * as rankingScraper from "./ranking-scraper.js";

const url = "https://badmintonplayer.dk/DBF/Ranglister/#287,2021,,0,,,1095,0,,,,15,,,,0,,,,,,";

(async function () {
    await rankingScraper.scrape(url);
    await rankingScraper.close();
})();
