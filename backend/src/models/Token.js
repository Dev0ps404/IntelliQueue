import mongoose from "mongoose";
import {
  PRIORITY_REASONS,
  TOKEN_PRIORITIES,
  TOKEN_STATUS,
} from "../config/constants.js";

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    displayToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
      index: true,
    },
    isPriority: {
      type: Boolean,
      default: false,
      index: true,
    },
    priorityReason: {
      type: String,
      enum: [...PRIORITY_REASONS, null],
      default: null,
    },
    priorityReasonDescription: {
      type: String,
      default: null,
      trim: true,
      maxlength: 300,
    },
    priority: {
      type: String,
      enum: TOKEN_PRIORITIES,
      default: "normal",
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TOKEN_STATUS),
      default: TOKEN_STATUS.WAITING,
      index: true,
    },
    manualPriorityBoost: {
      type: Number,
      min: 0,
      default: 0,
    },
    position: {
      type: Number,
      default: null,
    },
    estimatedWaitMinutes: {
      type: Number,
      default: 0,
    },
    predictedCounterId: {
      type: String,
      default: null,
    },
    assignedCounterId: {
      type: String,
      default: null,
      index: true,
    },
    predictedStartAt: {
      type: Date,
      default: null,
    },
    notifiedNearTurn: {
      type: Boolean,
      default: false,
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    skippedAt: {
      type: Date,
      default: null,
    },
    serviceDurationSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    waitDurationSeconds: {
      type: Number,
      min: 0,
      default: 0,
    },
    deviceId: {
      type: String,
      default: null,
      index: true,
    },
    qrCodeDataUrl: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    minimize: false,
  },
);

tokenSchema.index({ status: 1, createdAt: 1, tokenNumber: 1 });
tokenSchema.index({ status: 1, priority: 1, createdAt: 1 });
tokenSchema.index({ status: 1, assignedCounterId: 1 });

const Token = mongoose.model("Token", tokenSchema);

export default Token;
