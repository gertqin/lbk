import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { init, close, scrapeSeason } from "./scraper";

const client = new S3Client({ region: "eu-north-1" });
const bucket = "gqh-lbk";
const prefix = "team-matches/";

export async function handler() {
    await init();

    const now = new Date();
    const season = await scrapeSeason();

    await close();

    const body = JSON.stringify({
        scrapeDate: now,
        season,
    });
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: `${prefix}${season.year}/latest.json`,
        Body: body,
    });
    await client.send(command);

    return {
        statusCode: 200,
    };
}
