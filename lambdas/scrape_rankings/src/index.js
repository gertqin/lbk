import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const client = new S3Client({ region: "eu-north-1" });

export async function handler() {
    // TODO scrape

    const body = {
        date: new Date(),
        data: {
            version: "v3",
        },
    };
    const command = new PutObjectCommand({
        Bucket: "gqh-lbk",
        Key: "test.json",
        Body: JSON.stringify(body),
    });

    const res = await client.send(command);

    return {
        statusCode: 200,
    };
}
