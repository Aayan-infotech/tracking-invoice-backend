import dotenv from "dotenv";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

dotenv.config();

const ENV = process.env.NODE_ENV || "production";
const REGION = process.env.AWS_REGION || "us-east-1";
const SECRET_NAME = "invoice"|| "invoice";
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

            // Email configuration
            EMAIL_USER: secrets.EMAIL_USER,
            EMAIL_PASS: secrets.EMAIL_PASS,

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

    // Email configuration
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,

  };
};

export { loadConfig };
