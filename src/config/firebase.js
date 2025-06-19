import admin from "firebase-admin";
import { loadConfig } from "./loadConfig.js";

const config = await loadConfig();


const serviceAccount =
    typeof config.FIREBASE_CONFIG === "string"
        ? JSON.parse(config.FIREBASE_CONFIG)
        : config.FIREBASE_CONFIG;



const firebaseAdmin = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

export { firebaseAdmin };
