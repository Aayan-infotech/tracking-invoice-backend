import dotenv from "dotenv";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

dotenv.config();

const ENV = process.env.NODE_ENV || "production";
const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_NAME = process.env.SECRET_NAME || "social-ecomm";
const secretsManager = new SecretsManagerClient({ region: REGION });

const loadConfig = async () => {
  if (ENV === "production") {
    try {
      const response = await secretsManager.send(
        new GetSecretValueCommand({ SecretId: SECRET_NAME })
      );

      if (response.SecretString) {
        try {
          const secrets = JSON.parse(response.SecretString);
          return {
            PORT: secrets.PORT,
            CORS_ORIGIN: secrets.CORS_ORIGIN,
            APP_URL: secrets.APP_URL,
            MONGODB_URI: secrets.MONGODB_URI,
            ACCESS_TOKEN_SECRET: secrets.ACCESS_TOKEN_SECRET,
            ACCESS_TOKEN_EXPIRY: secrets.ACCESS_TOKEN_EXPIRY,
            REFRESH_TOKEN_SECRET: secrets.REFRESH_TOKEN_SECRET,
            REFRESH_TOKEN_EXPIRY: secrets.REFRESH_TOKEN_EXPIRY,

            // AWS configuration
            AWS_REGION: secrets.AWS_REGION,
            AWS_BUCKET_NAME: secrets.AWS_BUCKET_NAME,
            AWS_ACCESS_KEY_ID: secrets.AWS_ACCESS_KEY_ID,
            AWS_SECRET_ACCESS_KEY: secrets.AWS_SECRET_ACCESS_KEY,

            // Twilio configuration
            TWILIO_ACCOUNT_SID: secrets.TWILIO_ACCOUNT_SID,
            TWILIO_AUTH_TOKEN: secrets.TWILIO_AUTH_TOKEN,
            TWILIO_SERVICE_SID: secrets.TWILIO_SERVICE_SID,
            TWILIO_PHONE_NUMBER: secrets.TWILIO_PHONE_NUMBER,

            // Email configuration
            EMAIL_USER: secrets.EMAIL_USER,
            EMAIL_PASS: secrets.EMAIL_PASS,

            // Stripe configuration
            STRIPE_PUBLIC_KEY: secrets.STRIPE_PUBLIC_KEY,
            STRIPE_SECRET_KEY: secrets.STRIPE_SECRET_KEY,


            // Firebase configuration
            FIREBASE_CONFIG: secrets.FIREBASE_CONFIG,
          };
        } catch (parseError) {
          console.error("JSON Parse Error:", parseError);
          throw new Error("Failed to parse secret value as JSON");
        }
      }
      throw new Error("No secret string found in the response");
    } catch (error) {
      console.error("AWS Secrets Fetch Error:", error);
      throw new Error("Failed to load secrets from AWS Secrets Manager");
    }
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: process.env.PORT || 3030,
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
    APP_URL: process.env.APP_URL || "http://localhost:3000",
    MONGODB_URI: process.env.MONGODB_URI,
    ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY || "15m",
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY || "7d",

    // AWS configuration
    AWS_REGION: process.env.AWS_REGION || "us-east-1",
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

    // Twilio configuration
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_SERVICE_SID: process.env.TWILIO_SERVICE_SID,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER,

    // Email configuration
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,

    // Stripe configuration
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,

    FIREBASE_CONFIG: process.env.FIREBASE_CONFIG, 
  };
};

export { loadConfig };
