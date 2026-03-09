const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});


const uploadFileToS3 = async (fileBuffer, fileName, keyPrefix) => {
  try {
    const fileExtension = fileName.split(".").pop();
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;
    const key = `${keyPrefix}/${uniqueFileName}`;


    const getContentType = (ext) => {
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'pdf': 'application/pdf',
        'txt': 'text/plain',
        'json': 'application/json',
        'mp4': 'video/mp4',
        'mp3': 'audio/mpeg'
      };
      return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
    };

    const putObjectParams = {
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: getContentType(fileExtension),
    };
    const command = new PutObjectCommand(putObjectParams);
    await r2Client.send(command);

    const domain = process.env.R2_ENDPOINT.replace('https://', '');
    const fileUrl = `https://${domain}/${key}`;

    return fileUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error("Failed to upload file to R2");
  }
};

module.exports = uploadFileToS3;