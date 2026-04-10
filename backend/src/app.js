import compression from "compression";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import tokenRoutes from "./routes/tokenRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { globalApiLimiter, authLimiter } from "./middleware/rateLimiters.js";
import { logger } from "./utils/logger.js";

const app = express();

const parseOrigins = (originValue) => {
  if (!originValue) {
    return true;
  }

  const origins = originValue
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return origins.length ? origins : true;
};

app.use(helmet());
app.use(compression());
app.use(globalApiLimiter);

app.use(
  cors({
    origin: parseOrigins(process.env.FRONTEND_URL),
    credentials: true,
  }),
);
app.use(express.json({ limit: "300kb" }));

app.use((req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    logger.info("http_request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Date.now() - startTime,
      ip: req.ip,
    });
  });

  next();
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: "v1",
    service: "AI-Powered Adaptive Queue System API",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: "v1",
    service: "AI-Powered Adaptive Queue System API",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/tokens", tokenRoutes);
app.use("/api/admin", adminRoutes);

app.use("/api/v1/auth", authLimiter, authRoutes);
app.use("/api/v1/tokens", tokenRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
