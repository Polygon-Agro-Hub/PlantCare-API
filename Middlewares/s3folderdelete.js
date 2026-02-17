const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});


const deleteFolderFromR2 = async (folderPath) => {


  const listParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: folderPath,
  };

  try {
    const listCommand = new ListObjectsV2Command(listParams);
    const response = await r2Client.send(listCommand);
    const objects = response.Contents;

    if (!objects || objects.length === 0) {
      return;
    }

    // Delete each object in the folder
    for (const object of objects) {
      const deleteParams = {
        Bucket: process.env.R2_BUCKET_NAME,
        Key: object.Key,
      };

      const deleteCommand = new DeleteObjectCommand(deleteParams);
      await r2Client.send(deleteCommand);
    }

  } catch (error) {
    console.error("Error deleting folder from R2:", error);
    throw new Error("Failed to delete folder from R2");
  }
};

module.exports = deleteFolderFromR2;
