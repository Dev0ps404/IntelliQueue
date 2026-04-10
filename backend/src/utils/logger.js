import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDirPath = path.resolve(__dirname, "../../logs");
const logFilePath = path.join(logDirPath, "events.log");

const logLevel = (process.env.LOG_LEVEL || "info").toLowerCase();
const persistToFile =
  (process.env.LOG_TO_FILE || "true").toLowerCase() === "true";

const levelOrder = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const canLog = (level) => {
  const threshold = levelOrder[logLevel] ?? levelOrder.info;
  const current = levelOrder[level] ?? levelOrder.info;
  return current <= threshold;
};

const persistLog = async (entry) => {
  if (!persistToFile) {
    return;
  }

  try {
    await fs.mkdir(logDirPath, { recursive: true });
    await fs.appendFile(logFilePath, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (error) {
    // Ignore file logging errors so runtime functionality remains unaffected.
  }
};

const writeLog = (level, message, meta = null) => {
  if (!canLog(level)) {
    return;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  const text = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;

  if (level === "error") {
    console.error(text, meta ?? "");
  } else if (level === "warn") {
    console.warn(text, meta ?? "");
  } else {
    console.log(text, meta ?? "");
  }

  void persistLog(entry);
};

export const logger = {
  error: (message, meta) => writeLog("error", message, meta),
  warn: (message, meta) => writeLog("warn", message, meta),
  info: (message, meta) => writeLog("info", message, meta),
  debug: (message, meta) => writeLog("debug", message, meta),
};
