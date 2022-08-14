import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({ region: "eu-north-1" });
const command = new ListObjectsV2Command({ Bucket: "gqh-lbk" });

export const handler = async (event) => {
    const res = await client.send(command);

    const response = {
        statusCode: 200,
        body: res,
    };
    return response;
};
