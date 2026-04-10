import rateLimit from "express-rate-limit";

const rateLimitDisabled =
  (process.env.RATE_LIMIT_DISABLED || "false").toLowerCase() === "true";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const buildLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max: rateLimitDisabled ? Number.MAX_SAFE_INTEGER : max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message,
    },
  });

export const globalApiLimiter = buildLimiter({
  windowMs: toInt(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: toInt(process.env.GLOBAL_RATE_LIMIT_MAX, 1200),
  message: "Too many requests. Please try again later.",
});

export const authLimiter = buildLimiter({
  windowMs: toInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  max: toInt(process.env.AUTH_RATE_LIMIT_MAX, 60),
  message: "Too many auth attempts. Please retry later.",
});

export const tokenCreateLimiter = buildLimiter({
  windowMs: toInt(process.env.TOKEN_RATE_LIMIT_WINDOW_MS, 5 * 60 * 1000),
  max: toInt(process.env.TOKEN_RATE_LIMIT_MAX, 200),
  message: "Token creation limit reached. Please wait a bit.",
});
