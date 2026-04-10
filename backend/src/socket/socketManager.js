import { Server } from "socket.io";
import { logger } from "../utils/logger.js";

const parseOrigins = (originString) => {
  if (!originString) {
    return "*";
  }

  const origins = originString
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length ? origins : "*";
};

export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: parseOrigins(process.env.FRONTEND_URL),
      methods: ["GET", "POST", "PATCH"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info("socket_connected", {
      socketId: socket.id,
      transport: socket.conn.transport.name,
    });

    socket.on("join-token-room", (tokenId) => {
      if (tokenId) {
        socket.join(`token:${tokenId}`);
      }
    });

    socket.on("join-device-room", (deviceId) => {
      if (deviceId) {
        socket.join(`device:${deviceId}`);
      }
    });

    socket.on("join-admin-room", () => {
      socket.join("admin-room");
    });

    socket.on("disconnect", (reason) => {
      logger.info("socket_disconnected", {
        socketId: socket.id,
        reason,
      });
    });
  });

  return io;
};
