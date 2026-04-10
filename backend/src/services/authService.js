import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { USER_ROLES } from "../config/constants.js";
import AppError from "../utils/appError.js";

const ensureJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new AppError("JWT_SECRET is required in environment.", 500);
  }

  return secret;
};

export const createAccessToken = (user) => {
  const jwtSecret = ensureJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || "12h";

  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      email: user.email,
    },
    jwtSecret,
    { expiresIn },
  );
};

export const registerUser = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email: email.toLowerCase() }).lean();

  if (existing) {
    throw new AppError("A user with this email already exists.", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: role || USER_ROLES.USER,
  });

  return user;
};

export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password.", 401);
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    throw new AppError("Invalid email or password.", 401);
  }

  user.lastLoginAt = new Date();
  await user.save();

  return user;
};

export const seedDefaultUsers = async () => {
  const hasAnyUser = await User.exists({});

  if (hasAnyUser) {
    return;
  }

  const defaultAdminEmail =
    process.env.DEFAULT_ADMIN_EMAIL || "admin@queue.local";
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";
  const defaultUserEmail = process.env.DEFAULT_USER_EMAIL || "user@queue.local";
  const defaultUserPassword = process.env.DEFAULT_USER_PASSWORD || "user12345";

  const adminPasswordHash = await bcrypt.hash(defaultAdminPassword, 10);
  const userPasswordHash = await bcrypt.hash(defaultUserPassword, 10);

  await User.insertMany([
    {
      name: "System Admin",
      email: defaultAdminEmail.toLowerCase(),
      passwordHash: adminPasswordHash,
      role: USER_ROLES.ADMIN,
      isActive: true,
    },
    {
      name: "Standard User",
      email: defaultUserEmail.toLowerCase(),
      passwordHash: userPasswordHash,
      role: USER_ROLES.USER,
      isActive: true,
    },
  ]);
};
