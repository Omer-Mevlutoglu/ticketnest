import { v2 as cloudinary } from "cloudinary";
import { getConfig } from "./env";

const { cloudinary: cloudinaryConfig } = getConfig();
cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
});

export default cloudinary;
