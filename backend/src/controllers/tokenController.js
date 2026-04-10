import AppError from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { TOKEN_STATUS } from "../config/constants.js";
import {
  buildQueueSnapshot,
  createTokenEntry,
  getTokenByNumber,
  getTokenQrByNumber,
  updateTokenStatus,
} from "../services/queueService.js";

const actorFromRequest = (req) => {
  if (!req.user) {
    return null;
  }

  return {
    id: req.user.id,
    role: req.user.role,
  };
};

export const createToken = asyncHandler(async (req, res) => {
  const io = req.app.get("io");

  const isPriority = Boolean(req.body.isPriority);
  const resolvedPriority =
    req.body.priority || (isPriority ? "priority" : "normal");

  const token = await createTokenEntry(
    {
      name: req.body.name,
      phone: req.body.phone,
      isPriority,
      priorityReason: isPriority ? req.body.priorityReason || null : null,
      priorityReasonDescription: req.body.priorityReasonDescription,
      priority: resolvedPriority,
      includeQr: req.body.includeQr,
      deviceId: req.body.deviceId,
    },
    io,
    actorFromRequest(req),
  );

  const hydratedToken = await getTokenByNumber(token.tokenNumber);

  return sendSuccess(res, {
    statusCode: 201,
    message: "Token generated successfully.",
    data: {
      token: hydratedToken,
    },
  });
});

export const getMyToken = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;
  const token = await getTokenByNumber(tokenNumber);

  if (!token) {
    throw new AppError("Token not found.", 404);
  }

  return sendSuccess(res, {
    data: {
      token,
    },
  });
});

export const getMyTokenQr = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;
  const tokenQr = await getTokenQrByNumber(tokenNumber);

  if (!tokenQr) {
    throw new AppError("Token not found.", 404);
  }

  return sendSuccess(res, {
    data: {
      tokenQr,
    },
  });
});

export const cancelMyToken = asyncHandler(async (req, res) => {
  const { tokenNumber } = req.params;
  const token = await getTokenByNumber(tokenNumber);

  if (!token) {
    throw new AppError("Token not found.", 404);
  }

  if (
    token.status !== TOKEN_STATUS.WAITING &&
    token.status !== TOKEN_STATUS.SERVING
  ) {
    throw new AppError("Only active tokens can be cancelled.", 400);
  }

  const io = req.app.get("io");

  const updatedToken = await updateTokenStatus(
    token._id,
    TOKEN_STATUS.SKIPPED,
    io,
    actorFromRequest(req),
  );

  return sendSuccess(res, {
    message: "Token cancelled successfully.",
    data: {
      token: updatedToken,
    },
  });
});

export const getQueue = asyncHandler(async (_req, res) => {
  const snapshot = await buildQueueSnapshot();

  return sendSuccess(res, {
    data: {
      queue: snapshot.queue,
      config: snapshot.config,
      counters: snapshot.counters,
      summary: {
        totalInQueue: snapshot.queue.length,
        servingToken: snapshot.servingToken,
        servingTokens: snapshot.summary.servingTokens,
      },
    },
  });
});
