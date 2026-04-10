import jwt from "jsonwebtoken";
import User from "../models/User.js";
import AppError from "../utils/appError.js";
import { USER_ROLES } from "../config/constants.js";

const isAuthDisabled = () =>
  (process.env.AUTH_DISABLED || "true").toLowerCase() === "true";

const parseTokenFromHeader = (authorizationHeader = "") => {
  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice(7).trim();
};

const getDevRole = (req) => {
  const headerRole = String(req.headers["x-user-role"] || "").toLowerCase();

  if (Object.values(USER_ROLES).includes(headerRole)) {
    return headerRole;
  }

  return USER_ROLES.ADMIN;
};

const resolveUserFromJwt = async (rawToken) => {
  if (!rawToken) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new AppError("JWT_SECRET is missing from environment.", 500);
  }

  const decoded = jwt.verify(rawToken, jwtSecret);
  const user = await User.findById(decoded.sub).lean();

  if (!user || !user.isActive) {
    throw new AppError("Authentication failed for this account.", 401);
  }

  return {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
  };
};

export const authenticate = (required = true) => {
  return async (req, _res, next) => {
    try {
      const rawToken = parseTokenFromHeader(req.headers.authorization);

      if (isAuthDisabled()) {
        if (rawToken) {
          try {
            req.user = await resolveUserFromJwt(rawToken);
            return next();
          } catch (_error) {
            // In auth-bypass mode, fallback to dev user if token is invalid.
          }
        }

        req.user = {
          id: "dev-user",
          email: String(req.headers["x-user-email"] || "dev@local"),
          role: getDevRole(req),
        };
        return next();
      }

      if (!rawToken) {
        if (required) {
          throw new AppError("Authentication token is required.", 401);
        }

        return next();
      }

      req.user = await resolveUserFromJwt(rawToken);

      return next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      return next(
        new AppError("Invalid or expired authentication token.", 401),
      );
    }
  };
};

export const authorizeRoles = (...roles) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError("Access denied.", 403));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission for this action.", 403),
      );
    }

    return next();
  };
};
