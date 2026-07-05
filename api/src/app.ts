import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { apiRouter } from "./routes/index.js";
import { errorHandler } from "./middleware/error.js";
import { env } from "./config.js";

// Throttle auth endpoints to blunt credential-stuffing / brute force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

export function createApp() {
  const app = express();

  // Behind a proxy in prod (correct client IPs for rate limiting, Secure cookies).
  app.set("trust proxy", 1);

  app.use(helmet());
  // Credentialed CORS requires an explicit origin (never "*") so the session
  // cookie can flow between the web app and this API.
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authLimiter);
  app.use("/api", apiRouter);

  app.use(errorHandler);

  return app;
}
