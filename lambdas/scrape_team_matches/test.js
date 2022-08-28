require("dotenv").config();
const lambda = require("./dist/index");

(async function () {
    console.log(await lambda.handler({}));
})();
