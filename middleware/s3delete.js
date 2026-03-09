const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});


const deleteFromR2 = async (imageUrl) => {;
  const extractFolderAndFileName = (url) => {
    const path = new URL(url).pathname; 
    const pathSegments = path.split('/');

    const folder = pathSegments.slice(1, -1).join('/');

    const fileName = pathSegments[pathSegments.length - 1]; 

    return { folder, fileName };
  };

  const { folder, fileName } = extractFolderAndFileName(imageUrl);

  const deleteParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Key: `${folder}/${fileName}`
  };

  try {
    const command = new DeleteObjectCommand(deleteParams);
    await r2Client.send(command);
  } catch (error) {
    console.error("Error deleting file from R2:", error);
    throw new Error("Failed to delete file from R2");
  }
};

module.exports = deleteFromR2;

