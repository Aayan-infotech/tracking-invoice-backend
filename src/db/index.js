import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";
import { loadConfig } from "../config/loadConfig.js";
import logger from "../utils/logger.js";

const secret = await loadConfig();

const connectDB = async () => {
   try {
      const connectionInstance = await mongoose.connect(`${secret.MONGODB_URI}/${DB_NAME}`)
      console.log(`\n MongoDB Connection !! DB Host : ${connectionInstance.connection.host}`);
   } catch (error) {
      logger.error("MONGODB connection failed", error);
      console.log("MONGODB connection failed", error);
      process.exit(1);
   }
}

export default connectDB