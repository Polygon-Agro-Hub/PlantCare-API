// const AWS = require("aws-sdk");
// const { v4: uuidv4 } = require("uuid");

// const s3 = new AWS.S3({
//   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   region: process.env.AWS_REGION,
// });

// /**
//  * Uploads a file to S3 and returns the file URL.
//  * @param {Buffer} fileBuffer - The file buffer to upload.
//  * @param {string} fileName - The original file name.
//  * @param {string} keyPrefix - The prefix path (folder structure) in the S3 bucket.
//  * @returns {Promise<string>} - Resolves with the file URL after successful upload.
//  */
// const uploadFileToS3 = async (fileBuffer, fileName, keyPrefix) => {
//   try {
//     const fileExtension = fileName.split(".").pop(); // Get file extension
//     const uniqueFileName = `${uuidv4()}.${fileExtension}`; // Generate a unique file name
//     const s3Params = {
//       Bucket: process.env.AWS_S3_BUCKET_NAME,
//       Key: `${keyPrefix}/${uniqueFileName}`, // Full path in the bucket
//       Body: fileBuffer,
//       ContentType: `image/${fileExtension}`, // Assuming an image, adjust if needed
//       ACL: "public-read", // File visibility
//     };

//     const result = await s3.upload(s3Params).promise();
//     return result.Location; // Return the file URL
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     throw new Error("Failed to upload file to S3");
//   }
// };

// module.exports =  uploadFileToS3 ;

// const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
// const { v4: uuidv4 } = require("uuid");

// // Create S3 client once (outside of functions)
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

// /**
//  * Uploads a file to S3 and returns the file URL.
//  * @param {Buffer} fileBuffer - The file buffer to upload.
//  * @param {string} fileName - The original file name.
//  * @param {string} keyPrefix - The prefix path (folder structure) in the S3 bucket.
//  * @returns {Promise<string>} - Resolves with the file URL after successful upload.
//  */
// const uploadFileToS3 = async (fileBuffer, fileName, keyPrefix) => {
//   try {
//     const fileExtension = fileName.split(".").pop(); // Get file extension
//     const uniqueFileName = `${uuidv4()}.${fileExtension}`; // Generate a unique file name
//     const key = `${keyPrefix}/${uniqueFileName}`;

//     const putObjectParams = {
//       Bucket: process.env.AWS_S3_BUCKET_NAME,
//       Key: key, // Full path in the bucket
//       Body: fileBuffer,
//       ContentType: `image/${fileExtension}`, // Assuming an image, adjust if needed
//       ACL: "public-read", // File visibility
//     };

//     // Create and send the PutObjectCommand
//     const command = new PutObjectCommand(putObjectParams);
//     await s3Client.send(command);

//     // Construct the URL manually since v3 doesn't return the URL directly
//     const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
//     return fileUrl;
//   } catch (error) {
//     console.error("Error uploading to S3:", error);
//     throw new Error("Failed to upload file to S3");
//   }
// };

// module.exports = uploadFileToS3;



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

/**
 * @param {Buffer} fileBuffer - The file buffer to upload.
 * @param {string} fileName - The original file name.
 * @param {string} keyPrefix - The prefix path (folder structure) in the R2 bucket.
 * @returns {Promise<string>} - Resolves with the file URL after successful upload.
 */
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