import QueueEvent from "../models/QueueEvent.js";
import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const logQueueEvent = async ({
  eventType,
  tokenId = null,
  actor = null,
  metadata = {},
}) => {
  const actorRole = actor?.role || "system";
  const actorUserId =
    actor?.id && mongoose.Types.ObjectId.isValid(actor.id) ? actor.id : null;

  try {
    const event = await QueueEvent.create({
      eventType,
      token: tokenId,
      actorUserId,
      actorRole,
      metadata,
    });

    logger.info("queue_event", {
      eventType,
      tokenId,
      actorRole,
      metadata,
    });

    return event;
  } catch (error) {
    logger.error("queue_event_persist_failed", {
      eventType,
      tokenId,
      actorRole,
      error: error.message,
    });

    return null;
  }
};

export const getRecentQueueEvents = async ({
  limit = 100,
  eventType = null,
}) => {
  const query = eventType ? { eventType } : {};

  return QueueEvent.find(query).sort({ createdAt: -1 }).limit(limit).lean();
};
