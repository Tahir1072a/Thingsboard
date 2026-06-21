const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config();

console.log("R2_ENDPOINT:", process.env.R2_ENDPOINT);
console.log("R2_BUCKET_NAME:", process.env.R2_BUCKET_NAME);
console.log("R2_PUBLIC_URL:", process.env.R2_PUBLIC_URL);

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function test() {
  try {
    const key = `test-${Date.now()}.txt`;
    const res = await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME || "thingsboard-uploads",
        Key: key,
        Body: Buffer.from("Hello from Antigravity test!"),
        ContentType: "text/plain",
      })
    );
    console.log("Upload Success!", res);
    
    const url = process.env.R2_PUBLIC_URL
      ? `${process.env.R2_PUBLIC_URL}/${key}`
      : `${process.env.R2_ENDPOINT}/${process.env.R2_BUCKET_NAME}/${key}`;
    console.log("Access URL:", url);
  } catch (err) {
    console.error("Upload Failed:", err);
  }
}

test();
