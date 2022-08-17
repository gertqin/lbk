import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { init, close, scrapeRankingInfo, scrapePlayers } from "./scraper";

const client = new S3Client({ region: "eu-north-1" });
const bucket = "gqh-lbk";
const prefix = "rankings/";

export async function handler() {
    const objectsResponse = await client.send(
        new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
        })
    );
    const existingRankingVersions = objectsResponse.Contents.map((c) => c.Key.substring(prefix.length).split(".")[0]);

    await init();
    const info = await scrapeRankingInfo();

    if (existingRankingVersions.includes(info.version)) {
        console.log(`Skipping ${info.version} as it already exists`);
    } else {
        console.log(`Scraping ${info.version}`);

        const players = await scrapePlayers();

        const body = JSON.stringify({
            ...info,
            players,
        });

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: `${prefix}${info.version}.json`,
            Body: body,
        });
        await client.send(command);
    }

    await close();

    return {
        statusCode: 200,
    };
}
