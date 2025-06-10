import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes/index.js";
import { loadConfig } from "./config/loadConfig.js";

const app = express();

const secret = await loadConfig();


app.use(
  cors({
    origin: secret.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.use("/api/", routes);
app.get("/", (req, res, next) => res.end("Hello world"));


export { app };
