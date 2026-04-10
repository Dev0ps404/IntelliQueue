import AppError from "../utils/appError.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import {
  buildQueueSnapshot,
  getQueueAnalytics,
  getQueueConfig,
  getQueueEventLogs,
  getQueueStats,
  prioritizeToken,
  startNextToken,
  updateQueueConfig,
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

export const getLiveQueue = asyncHandler(async (_req, res) => {
  const snapshot = await buildQueueSnapshot();

  return sendSuccess(res, {
    data: {
      queue: snapshot.queue,
      config: snapshot.config,
      counters: snapshot.counters,
      servingToken: snapshot.servingToken,
      servingTokens: snapshot.summary.servingTokens,
      diagnostics: snapshot.diagnostics,
    },
  });
});

export const patchTokenStatus = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const { status } = req.body;

  const io = req.app.get("io");
  const token = await updateTokenStatus(
    tokenId,
    status,
    io,
    actorFromRequest(req),
  );

  if (!token) {
    throw new AppError("Token not found.", 404);
  }

  return sendSuccess(res, {
    message: `Token marked as ${status}.`,
    data: {
      token,
    },
  });
});

export const patchPrioritizeToken = asyncHandler(async (req, res) => {
  const { tokenId } = req.params;
  const { boost } = req.body;
  const io = req.app.get("io");

  const token = await prioritizeToken(
    tokenId,
    boost,
    io,
    actorFromRequest(req),
  );

  if (!token) {
    throw new AppError("Token not found.", 404);
  }

  return sendSuccess(res, {
    message: "Token prioritized successfully.",
    data: {
      token,
    },
  });
});

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await getQueueStats();

  return sendSuccess(res, {
    data: {
      stats,
    },
  });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  const hours = Number(req.query.hours || 24);
  const analytics = await getQueueAnalytics({ hours });

  return sendSuccess(res, {
    data: {
      analytics,
    },
  });
});

export const getQueueEvents = asyncHandler(async (req, res) => {
  const events = await getQueueEventLogs({
    limit: req.query.limit,
    eventType: req.query.eventType,
  });

  return sendSuccess(res, {
    data: {
      events,
    },
  });
});

export const getFlowConfig = asyncHandler(async (_req, res) => {
  const config = await getQueueConfig();

  return sendSuccess(res, {
    data: {
      config,
    },
  });
});

export const patchFlowConfig = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const config = await updateQueueConfig(req.body, io, actorFromRequest(req));

  return sendSuccess(res, {
    message: "Queue flow updated successfully.",
    data: {
      config,
    },
  });
});

export const advanceQueue = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const servingToken = await startNextToken(io, actorFromRequest(req));

  return sendSuccess(res, {
    message: servingToken
      ? "Queue advanced successfully."
      : "No waiting tokens found.",
    data: {
      servingToken,
    },
  });
});
