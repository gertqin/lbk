import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "eu-north-1" });
const command = new GetObjectCommand({ Bucket: "gqh-lbk", Key: "test.json" });

const streamToString = (stream) =>
    new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

export async function handler() {
    const res = await client.send(command);
    const content = await streamToString(res.Body);

    return {
        statusCode: 200,
        body: JSON.parse(content),
    };
}
