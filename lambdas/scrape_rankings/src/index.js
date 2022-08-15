import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { scrape, close } from "./scraper";

const client = new S3Client({ region: "eu-north-1" });

export async function handler() {
    const url = "https://badmintonplayer.dk/DBF/Ranglister/#287,2021,,0,,,1095,0,,,,15,,,,0,,,,,,";
    await scrape(url);
    await close();

    // const body = {
    //     date: new Date(),
    //     data: {
    //         version: "v3",
    //     },
    // };
    // const command = new PutObjectCommand({
    //     Bucket: "gqh-lbk",
    //     Key: "test.json",
    //     Body: JSON.stringify(body),
    // });
    //
    // const res = await client.send(command);

    return {
        statusCode: 200,
    };
}
