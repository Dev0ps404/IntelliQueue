import dotenv from "dotenv";
import http from "http";
import app from "./app.js";
import connectDB, { closeDB } from "./config/db.js";
import { seedDefaultUsers } from "./services/authService.js";
import { bootstrapQueue } from "./services/queueService.js";
import { initializeSocket } from "./socket/socketManager.js";
import { logger } from "./utils/logger.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

let activeHttpServer = null;

const gracefulShutdown = async (signal) => {
  logger.info("shutdown_initiated", { signal });

  try {
    if (activeHttpServer) {
      await new Promise((resolve, reject) => {
        activeHttpServer.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await closeDB();
    logger.info("shutdown_complete");
    process.exit(0);
  } catch (error) {
    logger.error("shutdown_failed", { message: error.message });
    process.exit(1);
  }
};

const startServer = async () => {
  try {
    await connectDB();
    await seedDefaultUsers();

    const httpServer = http.createServer(app);
    const io = initializeSocket(httpServer);
    activeHttpServer = httpServer;

    app.set("io", io);

    await bootstrapQueue(io);

    httpServer.listen(PORT, () => {
      logger.info("server_started", {
        url: `http://localhost:${PORT}`,
        authDisabled:
          (process.env.AUTH_DISABLED || "true").toLowerCase() === "true",
      });
    });
  } catch (error) {
    logger.error("server_startup_failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

startServer();

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
