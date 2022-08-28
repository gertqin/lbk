require("dotenv").config();

const lambdaFolder = process.argv[2];
const lambda = require(`./${lambdaFolder}/dist/index`);

(async function () {
    console.log(await lambda.handler({}));
})();
