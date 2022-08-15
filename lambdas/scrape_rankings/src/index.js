import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { scrape, close } from "./scraper";

const scrape_url = "https://badmintonplayer.dk/DBF/Ranglister/#287,2021,,0,,,1095,0,,,,15,,,,0,,,,,,";

const client = new S3Client({ region: "eu-north-1" });

export async function handler() {
    const now = new Date().toJSON();

    const players = await scrape(scrape_url);
    await close();

    const body = JSON.stringify({
        scrapeDate: now,
        players,
    });
    const command1 = new PutObjectCommand({
        Bucket: "gqh-lbk",
        Key: `rankings/${now}.json`,
        Body: body,
    });
    const command2 = new PutObjectCommand({
        Bucket: "gqh-lbk",
        Key: `rankings/latest.json`,
        Body: body,
    });

    await Promise.all([client.send(command1), client.send(command2)]);

    return {
        statusCode: 200,
    };
}
