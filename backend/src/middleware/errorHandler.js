import mongoose from "mongoose";
import AppError from "../utils/appError.js";
import { logger } from "../utils/logger.js";

const mapMongooseError = (error) => {
  if (error instanceof mongoose.Error.ValidationError) {
    return new AppError("Database validation failed.", 400, error.errors);
  }

  if (error?.code === 11000) {
    return new AppError("Duplicate value detected.", 409, error.keyValue);
  }

  if (error instanceof mongoose.Error.CastError) {
    return new AppError("Invalid resource identifier.", 400);
  }

  return null;
};

export const errorHandler = (error, req, res, _next) => {
  const mapped = mapMongooseError(error);
  const finalError = mapped || error;

  const statusCode =
    finalError instanceof AppError ? finalError.statusCode : 500;
  const message =
    finalError instanceof AppError
      ? finalError.message
      : "An unexpected server error occurred.";

  logger.error("request_failed", {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    message,
    details: finalError?.details || null,
    stack:
      process.env.NODE_ENV === "production" ? undefined : finalError?.stack,
  });

  return res.status(statusCode).json({
    success: false,
    message,
    ...(finalError?.details ? { details: finalError.details } : {}),
  });
};
