// Import required modules
import { nanoid } from "nanoid";
import { User } from "../models/user.model.js";
import { ApiError } from "./ApiError.js";

const generateUniqueUserId = async () => {
  let lastUser = await User.findOne({}, { userId: 1 }).sort({ createdAt: -1 });

  let lastNumber = lastUser ? parseInt(lastUser.userId.split("-")[1]) : 1000;
  let newNumber = (lastNumber + 1) % 10000;
  if (newNumber < 1001) newNumber = 1001;

  let formattedId = `user-${String(newNumber).padStart(5, "0")}`;
  return formattedId;
};

const generateOTP = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const generateUserName = (email) => {
  
}


export { generateUniqueUserId, generateOTP };
