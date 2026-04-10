export const TOKEN_PRIORITIES = ["normal", "priority"];

export const PRIORITY_REASONS = ["Elderly", "Emergency", "VIP"];

export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
};

export const TOKEN_STATUS = {
  WAITING: "waiting",
  SERVING: "serving",
  COMPLETED: "completed",
  SKIPPED: "skipped",
};

export const QUEUE_EVENT_TYPES = {
  TOKEN_CREATED: "token_created",
  TOKEN_STATUS_CHANGED: "token_status_changed",
  TOKEN_PRIORITIZED: "token_prioritized",
  QUEUE_REORDERED: "queue_reordered",
  COUNTER_ASSIGNED: "counter_assigned",
  FLOW_UPDATED: "flow_updated",
  NEAR_TURN_NOTIFIED: "near_turn_notified",
  AUTH_LOGIN: "auth_login",
};

export const DEFAULT_QUEUE_CONFIG = {
  averageServiceMinutes: 4,
  maxPriorityStreak: 2,
  maxPriorityShare: 0.7,
  priorityWeight: 1.3,
  starvationThresholdMinutes: 8,
  nearTurnThreshold: 2,
  activeCounters: 2,
  enableDynamicReordering: true,
  cacheTtlMs: 1500,
  historicalSampleSize: 150,
  autoServeNext: true,
  workingHours: {
    weekday: {
      start: "09:00",
      end: "18:00",
    },
    weekend: {
      start: "10:00",
      end: "14:00",
    },
  },
};

export const QUEUE_STATE_KEY = "global";

export const SOCKET_EVENTS = {
  QUEUE_UPDATE: "queue:update",
  QUEUE_REORDERED: "queue:reordered",
  TOKEN_CREATED: "token:created",
  TOKEN_STATUS_CHANGED: "token:status-changed",
  TOKEN_NEAR: "token:near",
  TOKEN_STATUS: "token:status",
};

export const buildDisplayToken = (tokenNumber) =>
  `AQ-${String(tokenNumber).padStart(4, "0")}`;
