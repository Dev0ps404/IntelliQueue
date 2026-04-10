import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let memoryServer = null;

const connectWithUri = async (mongoUri, label) => {
  // These defaults assume a typical long-running app server with moderate traffic.
  await mongoose.connect(mongoUri, {
    maxPoolSize: 20,
    minPoolSize: 5,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5_000,
    socketTimeoutMS: 45_000,
  });

  console.log(`MongoDB connected successfully (${label}).`);
};

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const allowMemoryFallback =
    (process.env.MONGO_MEMORY_FALLBACK ?? "true").toLowerCase() === "true";

  if (mongoUri) {
    try {
      await connectWithUri(mongoUri, "configured URI");
      return;
    } catch (error) {
      if (!allowMemoryFallback) {
        throw error;
      }

      console.warn(
        "Primary MongoDB connection failed, switching to in-memory MongoDB.",
      );
    }
  }

  if (!allowMemoryFallback) {
    throw new Error(
      "MONGO_URI is not defined and memory fallback is disabled.",
    );
  }

  memoryServer = await MongoMemoryServer.create({
    instance: {
      dbName: "ai_adaptive_queue",
      launchTimeout: 180_000,
    },
  });

  await connectWithUri(memoryServer.getUri(), "in-memory fallback");
};

export const closeDB = async () => {
  await mongoose.connection.close();

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

export default connectDB;
