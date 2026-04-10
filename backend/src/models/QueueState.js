import mongoose from "mongoose";
import { QUEUE_STATE_KEY } from "../config/constants.js";

const counterSchema = new mongoose.Schema(
  {
    counterId: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    servingToken: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    servedCount: {
      type: Number,
      default: 0,
    },
    avgServiceSeconds: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const queueStateSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: QUEUE_STATE_KEY,
    },
    currentServingToken: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Token",
      default: null,
    },
    counters: {
      type: [counterSchema],
      default: [],
    },
    consecutivePriorityServed: {
      type: Number,
      default: 0,
    },
    lastTokenNumber: {
      type: Number,
      default: 0,
    },
    lastOrderSignature: {
      type: String,
      default: "",
    },
    reorderVersion: {
      type: Number,
      default: 0,
    },
    lastReorderedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

queueStateSchema.index({ singletonKey: 1 }, { unique: true });

const QueueState = mongoose.model("QueueState", queueStateSchema);

export default QueueState;
