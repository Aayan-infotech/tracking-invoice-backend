import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import { ApiError } from "./ApiError.js";

// Initialize the S3 client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

// Function to upload an image to S3
const uploadImage = async (file) => {
  try {
    const fileContent = fs.readFileSync(file.path);
    if (!fileContent) {
      throw new ApiError(400, "Invalid file");
    }
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: file.filename,
      Body: fileContent,
      ContentType: file.mimetype,
    };

    const command = new PutObjectCommand(params);
    const data = await s3.send(command);

    // remove the file
    fs.unlinkSync(file.path);
    return {
      success: true,
      fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${file.filename}`,
    };
  } catch (error) {
    fs.unlinkSync(file.path);
    console.error("Error uploading file:", error);
    throw new ApiError(500, error.message);
  }
};

// Delete the image on the aws upload server using the imageURL
const deleteObject = async (imageUrl) => {
  try {
    const fileName = imageUrl.split("/").pop();
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
    };

    await s3.send(new DeleteObjectCommand(params));
    return `${fileName} deleted successfully from S3`;
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};


export {
  uploadImage,
  deleteObject,
};
