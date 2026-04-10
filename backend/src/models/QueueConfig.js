import mongoose from "mongoose";
import { DEFAULT_QUEUE_CONFIG, QUEUE_STATE_KEY } from "../config/constants.js";

const queueConfigSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      required: true,
      default: QUEUE_STATE_KEY,
    },
    averageServiceMinutes: {
      type: Number,
      min: 1,
      max: 60,
      default: DEFAULT_QUEUE_CONFIG.averageServiceMinutes,
    },
    maxPriorityStreak: {
      type: Number,
      min: 1,
      max: 10,
      default: DEFAULT_QUEUE_CONFIG.maxPriorityStreak,
    },
    maxPriorityShare: {
      type: Number,
      min: 0.3,
      max: 0.95,
      default: DEFAULT_QUEUE_CONFIG.maxPriorityShare,
    },
    priorityWeight: {
      type: Number,
      min: 0.8,
      max: 3,
      default: DEFAULT_QUEUE_CONFIG.priorityWeight,
    },
    starvationThresholdMinutes: {
      type: Number,
      min: 2,
      max: 120,
      default: DEFAULT_QUEUE_CONFIG.starvationThresholdMinutes,
    },
    nearTurnThreshold: {
      type: Number,
      min: 1,
      max: 10,
      default: DEFAULT_QUEUE_CONFIG.nearTurnThreshold,
    },
    activeCounters: {
      type: Number,
      min: 1,
      max: 20,
      default: DEFAULT_QUEUE_CONFIG.activeCounters,
    },
    enableDynamicReordering: {
      type: Boolean,
      default: DEFAULT_QUEUE_CONFIG.enableDynamicReordering,
    },
    cacheTtlMs: {
      type: Number,
      min: 250,
      max: 15_000,
      default: DEFAULT_QUEUE_CONFIG.cacheTtlMs,
    },
    historicalSampleSize: {
      type: Number,
      min: 25,
      max: 1_000,
      default: DEFAULT_QUEUE_CONFIG.historicalSampleSize,
    },
    autoServeNext: {
      type: Boolean,
      default: DEFAULT_QUEUE_CONFIG.autoServeNext,
    },
    workingHours: {
      weekday: {
        start: {
          type: String,
          default: DEFAULT_QUEUE_CONFIG.workingHours.weekday.start,
        },
        end: {
          type: String,
          default: DEFAULT_QUEUE_CONFIG.workingHours.weekday.end,
        },
      },
      weekend: {
        start: {
          type: String,
          default: DEFAULT_QUEUE_CONFIG.workingHours.weekend.start,
        },
        end: {
          type: String,
          default: DEFAULT_QUEUE_CONFIG.workingHours.weekend.end,
        },
      },
    },
  },
  {
    timestamps: true,
  },
);

queueConfigSchema.index({ singletonKey: 1 }, { unique: true });

const QueueConfig = mongoose.model("QueueConfig", queueConfigSchema);

export default QueueConfig;
