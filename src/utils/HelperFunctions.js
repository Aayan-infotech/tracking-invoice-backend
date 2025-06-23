// Import required modules
import { nanoid, customAlphabet } from "nanoid";
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

const generateUniqueUserName = async (email) => {
  let baseUsername = email.split("@")[0].toLowerCase().replace(/\s+/g, "_");
  let username = baseUsername;
  let counter = 1;

  while (await User.exists({ username })) {
    username = `${baseUsername}_${counter}`;
    counter++;
  }

  return username;
};

const randomSuffix = customAlphabet('1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);

const generateUniqueInvoiceNumber = async () => {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const rand = randomSuffix();
  return `INV-${yyyymmdd}-${rand}`;
}

// this function returns distance in meters between two coordinates
const distance = (coords1, coords2) => {
  const { lat: lat1, lon: lon1 } = coords1;
  const { lat: lat2, lon: lon2 } = coords2;
  const degToRad = x => x * Math.PI / 180;
  const R = 6371;
  const halfDLat = degToRad(lat2 - lat1) / 2;
  const halfDLon = degToRad(lon2 - lon1) / 2;
  const a = Math.sin(halfDLat) * Math.sin(halfDLat) +
    Math.cos(degToRad(lat1)) * Math.cos(degToRad(lat2)) *
    Math.sin(halfDLon) * Math.sin(halfDLon);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000;
}

export { generateUniqueUserId, generateOTP, generateUniqueUserName, generateUniqueInvoiceNumber, distance };
