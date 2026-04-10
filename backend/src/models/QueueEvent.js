import mongoose from "mongoose";
import { QUEUE_EVENT_TYPES } from "../config/constants.js";

const queueEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: Object.values(QUEUE_EVENT_TYPES),
      required: true,
      index: true,
    },
    token: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
      default: null,
      index: true,
    },
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      default: "system",
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

queueEventSchema.index({ createdAt: -1 });
queueEventSchema.index({ eventType: 1, createdAt: -1 });

const QueueEvent = mongoose.model("QueueEvent", queueEventSchema);

export default QueueEvent;
