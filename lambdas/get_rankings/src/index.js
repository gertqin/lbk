import { S3Client, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "eu-north-1" });
const bucket = "gqh-lbk";
const prefix = "rankings/";

export async function handler({ version }) {
    if (version) {
        const rankings = await getObjectData(`${prefix}${version}.json`);
        return {
            statusCode: 200,
            body: {
                versions: null,
                rankings,
            },
        };
    } else {
        const objectsResponse = await client.send(
            new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
            })
        );
        const contents = objectsResponse.Contents;
        contents.sort((a, b) => b.LastModified - a.LastModified);

        const rankings = await getObjectData(contents[0].Key);

        return {
            statusCode: 200,
            body: {
                versions: contents.map((content) => content.Key.substring(prefix.length).split(".")[0]),
                rankings,
            },
        };
    }
}

async function getObjectData(key) {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const res = await client.send(command);
    const content = await streamToString(res.Body);
    return JSON.parse(content);
}

function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("error", reject);
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
}
