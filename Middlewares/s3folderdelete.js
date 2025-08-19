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

/**
 * Deletes all files in a folder from Cloudflare R2.
 * @param {string} folderPath - The folder path to delete (e.g., "users/profile-images/${userId}").
 * @returns {Promise<void>}
 */
const deleteFolderFromR2 = async (folderPath) => {
  console.log("Folder Path to delete:", folderPath);

  const listParams = {
    Bucket: process.env.R2_BUCKET_NAME,
    Prefix: folderPath, // The folder path to list objects inside
  };

  try {
    // List all objects inside the specified folder
    const listCommand = new ListObjectsV2Command(listParams);
    const response = await r2Client.send(listCommand);
    const objects = response.Contents;

    if (!objects || objects.length === 0) {
      console.log("No objects found in the folder.");
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
      console.log(`Deleted object: ${object.Key}`);
    }

    console.log(`All objects in folder "${folderPath}" have been deleted.`);
  } catch (error) {
    console.error("Error deleting folder from R2:", error);
    throw new Error("Failed to delete folder from R2");
  }
};

module.exports = deleteFolderFromR2;
