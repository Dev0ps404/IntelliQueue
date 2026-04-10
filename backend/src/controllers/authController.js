import { asyncHandler } from "../middleware/asyncHandler.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
  authenticateUser,
  createAccessToken,
  registerUser,
} from "../services/authService.js";
import { logQueueEvent } from "../services/eventLogService.js";
import { QUEUE_EVENT_TYPES } from "../config/constants.js";

export const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: "User registered successfully.",
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const user = await authenticateUser(req.body);
  const accessToken = createAccessToken(user);

  await logQueueEvent({
    eventType: QUEUE_EVENT_TYPES.AUTH_LOGIN,
    actor: {
      id: user._id,
      role: user.role,
    },
    metadata: {
      email: user.email,
    },
  });

  return sendSuccess(res, {
    message: "Login successful.",
    data: {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
});

export const me = asyncHandler(async (req, res) => {
  return sendSuccess(res, {
    data: {
      user: req.user,
    },
  });
});
