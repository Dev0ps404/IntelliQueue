import {
  buildDisplayToken,
  DEFAULT_QUEUE_CONFIG,
  QUEUE_EVENT_TYPES,
  QUEUE_STATE_KEY,
  SOCKET_EVENTS,
  TOKEN_STATUS,
} from "../config/constants.js";
import QueueConfig from "../models/QueueConfig.js";
import QueueState from "../models/QueueState.js";
import Token from "../models/Token.js";
import AppError from "../utils/appError.js";
import { createTokenQrDataUrl } from "../utils/qr.js";
import {
  buildQueueAnalytics,
  getHistoricalServiceAverages,
} from "./analyticsService.js";
import { clearCache, getCacheValue, setCacheValue } from "./cacheService.js";
import { logQueueEvent, getRecentQueueEvents } from "./eventLogService.js";
import { rankWaitingTokens } from "./fairnessEngine.js";

const CACHE_KEYS = {
  SNAPSHOT: "queue:snapshot",
  STATS: "queue:stats",
};

const toPlain = (doc) => (doc?.toObject ? doc.toObject() : doc);

const isSameId = (a, b) => String(a) === String(b);

const stripInternalTokenFields = (token) => {
  if (!token || typeof token !== "object") {
    return token;
  }

  return Object.fromEntries(
    Object.entries(token).filter(([key]) =>
      key === "_id" || key === "__v" ? true : !key.startsWith("_"),
    ),
  );
};

const buildCounterTemplate = (index) => ({
  counterId: `counter-${index + 1}`,
  label: `Counter ${index + 1}`,
  isActive: true,
  servingToken: null,
  startedAt: null,
  servedCount: 0,
  avgServiceSeconds: 0,
});

const getOrCreateConfig = async () => {
  return QueueConfig.findOneAndUpdate(
    { singletonKey: QUEUE_STATE_KEY },
    {
      $setOnInsert: {
        singletonKey: QUEUE_STATE_KEY,
        ...DEFAULT_QUEUE_CONFIG,
      },
    },
    { new: true, upsert: true },
  );
};

const getOrCreateState = async (config) => {
  const activeCounters = Math.max(1, Number(config.activeCounters || 1));

  return QueueState.findOneAndUpdate(
    { singletonKey: QUEUE_STATE_KEY },
    {
      $setOnInsert: {
        singletonKey: QUEUE_STATE_KEY,
        counters: Array.from({ length: activeCounters }, (_, index) =>
          buildCounterTemplate(index),
        ),
        consecutivePriorityServed: 0,
        currentServingToken: null,
        lastTokenNumber: 0,
        reorderVersion: 0,
        lastOrderSignature: "",
        lastReorderedAt: null,
      },
    },
    { new: true, upsert: true },
  );
};

const ensureCounterTopology = (state, config) => {
  const activeCounters = Math.max(1, Number(config.activeCounters || 1));
  let changed = false;

  if (!Array.isArray(state.counters)) {
    state.counters = [];
    changed = true;
  }

  while (state.counters.length < activeCounters) {
    state.counters.push(buildCounterTemplate(state.counters.length));
    changed = true;
  }

  state.counters.forEach((counter, index) => {
    const shouldBeActive = index < activeCounters;

    if (counter.isActive !== shouldBeActive) {
      counter.isActive = shouldBeActive;
      changed = true;
    }

    if (!counter.counterId) {
      counter.counterId = `counter-${index + 1}`;
      changed = true;
    }

    if (!counter.label) {
      counter.label = `Counter ${index + 1}`;
      changed = true;
    }
  });

  return changed;
};

const getActiveCounters = (state) =>
  state.counters.filter((counter) => counter.isActive);

const toDate = (value) => {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
};

const calculateRemainingServiceSeconds = (token, avgServiceSeconds, now) => {
  const startedAt = toDate(token.startedAt);

  if (!startedAt) {
    return avgServiceSeconds;
  }

  const elapsedSeconds = Math.max(
    0,
    (now.getTime() - startedAt.getTime()) / 1000,
  );
  return Math.max(15, Math.round(avgServiceSeconds - elapsedSeconds));
};

const resolveServingTokens = async (state) => {
  const activeCounters = getActiveCounters(state);
  const tokenIds = activeCounters
    .map((counter) => counter.servingToken)
    .filter(Boolean)
    .map((id) => String(id));

  if (!tokenIds.length) {
    state.currentServingToken = null;
    return [];
  }

  const tokens = await Token.find({ _id: { $in: tokenIds } });
  const tokenMap = new Map(tokens.map((token) => [String(token._id), token]));

  let changed = false;
  const serving = [];

  for (const counter of activeCounters) {
    if (!counter.servingToken) {
      continue;
    }

    const token = tokenMap.get(String(counter.servingToken));

    if (!token || token.status !== TOKEN_STATUS.SERVING) {
      counter.servingToken = null;
      counter.startedAt = null;
      changed = true;
      continue;
    }

    serving.push({ counter, token });
  }

  const firstServingToken = serving[0]?.token?._id || null;

  if (
    String(state.currentServingToken || "") !== String(firstServingToken || "")
  ) {
    state.currentServingToken = firstServingToken;
    changed = true;
  }

  if (changed) {
    await state.save();
  }

  return serving;
};

const pickEarliestAvailableCounter = (counterAvailability) => {
  return counterAvailability.reduce((best, current) => {
    if (!best || current.availableAt < best.availableAt) {
      return current;
    }

    return best;
  }, null);
};

const buildPredictions = ({
  orderedWaiting,
  servingAssignments,
  activeCounters,
  avgServiceSeconds,
  now,
}) => {
  const counterAvailability = activeCounters.map((counter) => ({
    counterId: counter.counterId,
    availableAt: now.getTime(),
  }));

  for (const assignment of servingAssignments) {
    const remainingSeconds = calculateRemainingServiceSeconds(
      assignment.token,
      avgServiceSeconds,
      now,
    );

    const slot = counterAvailability.find(
      (counter) => counter.counterId === assignment.counter.counterId,
    );

    if (slot) {
      slot.availableAt = now.getTime() + remainingSeconds * 1000;
    }
  }

  const predictionMap = new Map();

  for (const token of orderedWaiting) {
    const selectedCounter = pickEarliestAvailableCounter(counterAvailability);

    if (!selectedCounter) {
      break;
    }

    const predictedWaitMinutes = Math.max(
      0,
      (selectedCounter.availableAt - now.getTime()) / 60000,
    );

    const dynamicServiceSeconds = Math.max(
      20,
      avgServiceSeconds * (token.priority === "priority" ? 0.92 : 1),
    );

    predictionMap.set(String(token._id), {
      predictedCounterId: selectedCounter.counterId,
      predictedStartAt: new Date(selectedCounter.availableAt),
      estimatedWaitMinutes: Number(predictedWaitMinutes.toFixed(1)),
    });

    selectedCounter.availableAt += dynamicServiceSeconds * 1000;
  }

  return predictionMap;
};

const buildQueueFromState = ({
  servingAssignments,
  orderedWaiting,
  predictions,
}) => {
  const servingEntries = servingAssignments.map((assignment, index) => ({
    ...stripInternalTokenFields(toPlain(assignment.token)),
    assignedCounterId: assignment.counter.counterId,
    position: index + 1,
    estimatedWaitMinutes: 0,
  }));

  const waitingEntries = orderedWaiting.map((token, index) => {
    const prediction = predictions.get(String(token._id)) || {
      predictedCounterId: null,
      predictedStartAt: null,
      estimatedWaitMinutes: 0,
    };

    return {
      ...stripInternalTokenFields(token),
      predictedCounterId: prediction.predictedCounterId,
      predictedStartAt: prediction.predictedStartAt,
      position: servingEntries.length + index + 1,
      estimatedWaitMinutes: prediction.estimatedWaitMinutes,
    };
  });

  return [...servingEntries, ...waitingEntries];
};

const persistQueueSnapshotMetrics = async (queue) => {
  if (queue.length) {
    await Token.bulkWrite(
      queue.map((token) => ({
        updateOne: {
          filter: { _id: token._id },
          update: {
            $set: {
              position: token.position,
              estimatedWaitMinutes: token.estimatedWaitMinutes,
              predictedStartAt: token.predictedStartAt || null,
              predictedCounterId: token.predictedCounterId || null,
            },
          },
        },
      })),
    );
  }

  await Token.updateMany(
    {
      status: { $in: [TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED] },
    },
    {
      $set: {
        position: null,
        estimatedWaitMinutes: 0,
        predictedStartAt: null,
        predictedCounterId: null,
      },
    },
  );
};

const updateReorderState = async (
  state,
  servingAssignments,
  orderedWaiting,
) => {
  const signature = [
    servingAssignments
      .map((entry) => `${entry.counter.counterId}:${entry.token._id}`)
      .join("|"),
    orderedWaiting.map((entry) => String(entry._id)).join("|"),
  ].join("::");

  if (state.lastOrderSignature === signature) {
    return false;
  }

  state.lastOrderSignature = signature;
  state.reorderVersion += 1;
  state.lastReorderedAt = new Date();
  await state.save();

  return true;
};

const emitNearTurnNotifications = async ({
  io,
  queue,
  threshold,
  activeCounterCount,
  actor,
}) => {
  if (!io) {
    return;
  }

  for (const item of queue) {
    if (item.status !== TOKEN_STATUS.WAITING) {
      continue;
    }

    const tokensAhead = Math.max(
      0,
      (item.position || 0) - activeCounterCount - 1,
    );

    if (tokensAhead > threshold || item.notifiedNearTurn) {
      continue;
    }

    io.to(`token:${item._id.toString()}`).emit(SOCKET_EVENTS.TOKEN_NEAR, {
      tokenNumber: item.tokenNumber,
      displayToken: item.displayToken,
      position: item.position,
      estimatedWaitMinutes: item.estimatedWaitMinutes,
      message: `Your turn is near for ${item.displayToken}.`,
    });

    if (item.deviceId) {
      io.to(`device:${item.deviceId}`).emit(SOCKET_EVENTS.TOKEN_NEAR, {
        tokenNumber: item.tokenNumber,
        displayToken: item.displayToken,
        position: item.position,
        estimatedWaitMinutes: item.estimatedWaitMinutes,
        message: `Your turn is near for ${item.displayToken}.`,
      });
    }

    await Token.updateOne(
      { _id: item._id },
      { $set: { notifiedNearTurn: true } },
    );

    await logQueueEvent({
      eventType: QUEUE_EVENT_TYPES.NEAR_TURN_NOTIFIED,
      tokenId: item._id,
      actor,
      metadata: {
        position: item.position,
        estimatedWaitMinutes: item.estimatedWaitMinutes,
      },
    });
  }
};

const emitQueueSnapshot = async ({
  io,
  snapshot,
  reason,
  reorderChanged,
  actor,
}) => {
  if (!io) {
    return;
  }

  io.emit(SOCKET_EVENTS.QUEUE_UPDATE, {
    queue: snapshot.queue,
    config: snapshot.config,
    summary: snapshot.summary,
    counters: snapshot.counters,
  });

  if (reorderChanged) {
    io.emit(SOCKET_EVENTS.QUEUE_REORDERED, {
      reason,
      reorderVersion: snapshot.state.reorderVersion,
      reorderedAt: snapshot.state.lastReorderedAt,
      queueHead: snapshot.queue.slice(0, 10),
    });

    await logQueueEvent({
      eventType: QUEUE_EVENT_TYPES.QUEUE_REORDERED,
      actor,
      metadata: {
        reason,
        reorderVersion: snapshot.state.reorderVersion,
      },
    });
  }

  await emitNearTurnNotifications({
    io,
    queue: snapshot.queue,
    threshold: snapshot.config.nearTurnThreshold,
    activeCounterCount: snapshot.summary.servingTokens.length,
    actor,
  });
};

const buildSnapshotInternal = async () => {
  const config = await getOrCreateConfig();
  const state = await getOrCreateState(config);

  let topologyChanged = ensureCounterTopology(state, config);

  if (topologyChanged) {
    await state.save();
  }

  const servingAssignments = await resolveServingTokens(state);
  const activeCounters = getActiveCounters(state);

  const waitingTokens = await Token.find({ status: TOKEN_STATUS.WAITING })
    .sort({ createdAt: 1, tokenNumber: 1 })
    .lean();

  const historical = await getHistoricalServiceAverages({
    sampleSize: config.historicalSampleSize,
    fallbackServiceSeconds: Math.max(
      60,
      Number(config.averageServiceMinutes) * 60,
    ),
  });

  const rankedPayload = config.enableDynamicReordering
    ? rankWaitingTokens({
        tokens: waitingTokens,
        config,
        state,
        activeCounterCount: activeCounters.length,
      })
    : {
        ordered: waitingTokens,
        diagnostics: {
          queuePressure: 0,
          plannedPriority: 0,
          totalPlanned: waitingTokens.length,
          endingPriorityStreak: state.consecutivePriorityServed,
        },
      };

  const orderedWaiting = rankedPayload.ordered;
  const predictions = buildPredictions({
    orderedWaiting,
    servingAssignments,
    activeCounters,
    avgServiceSeconds: historical.avgServiceSeconds,
    now: new Date(),
  });

  const queue = buildQueueFromState({
    servingAssignments,
    orderedWaiting,
    predictions,
  });

  await persistQueueSnapshotMetrics(queue);

  const reorderChanged = await updateReorderState(
    state,
    servingAssignments,
    orderedWaiting,
  );

  const summary = {
    totalInQueue: queue.length,
    servingToken:
      queue.find((item) => item.status === TOKEN_STATUS.SERVING) || null,
    servingTokens: queue.filter((item) => item.status === TOKEN_STATUS.SERVING),
    activeCounterCount: activeCounters.length,
  };

  return {
    queue,
    config: toPlain(config),
    state: toPlain(state),
    counters: activeCounters.map((counter) => ({
      counterId: counter.counterId,
      label: counter.label,
      isActive: counter.isActive,
      servingToken: counter.servingToken,
      startedAt: counter.startedAt,
      servedCount: counter.servedCount,
      avgServiceSeconds: counter.avgServiceSeconds,
    })),
    servingToken: summary.servingToken,
    summary,
    diagnostics: rankedPayload.diagnostics,
    historical,
    reorderChanged,
  };
};

export const buildQueueSnapshot = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh) {
    const cached = getCacheValue(CACHE_KEYS.SNAPSHOT);

    if (cached) {
      return cached;
    }
  }

  const snapshot = await buildSnapshotInternal();

  setCacheValue(CACHE_KEYS.SNAPSHOT, snapshot, snapshot.config.cacheTtlMs);

  return snapshot;
};

export const syncQueueAndBroadcast = async (
  io,
  reason = "queue_sync",
  actor = null,
) => {
  clearCache("queue:");

  const snapshot = await buildQueueSnapshot({ forceRefresh: true });

  await emitQueueSnapshot({
    io,
    snapshot,
    reason,
    reorderChanged: snapshot.reorderChanged,
    actor,
  });

  return snapshot;
};

const assignToAvailableCounters = async ({ io, reason, actor }) => {
  const config = await getOrCreateConfig();
  const state = await getOrCreateState(config);

  let topologyChanged = ensureCounterTopology(state, config);
  const servingAssignments = await resolveServingTokens(state);

  const activeCounters = getActiveCounters(state);
  const busyCounterIds = new Set(
    servingAssignments.map((entry) => entry.counter.counterId),
  );

  const freeCounters = activeCounters.filter(
    (counter) => !busyCounterIds.has(counter.counterId),
  );

  if (!freeCounters.length) {
    if (topologyChanged) {
      await state.save();
    }

    const snapshot = await syncQueueAndBroadcast(io, reason, actor);
    return { assignedTokens: [], snapshot };
  }

  const waitingTokens = await Token.find({ status: TOKEN_STATUS.WAITING })
    .sort({ createdAt: 1, tokenNumber: 1 })
    .lean();

  if (!waitingTokens.length) {
    if (topologyChanged) {
      await state.save();
    }

    const snapshot = await syncQueueAndBroadcast(io, reason, actor);
    return { assignedTokens: [], snapshot };
  }

  const ranked = rankWaitingTokens({
    tokens: waitingTokens,
    config,
    state,
    activeCounterCount: activeCounters.length,
  });

  const selected = ranked.ordered.slice(0, freeCounters.length);

  if (!selected.length) {
    if (topologyChanged) {
      await state.save();
    }

    const snapshot = await syncQueueAndBroadcast(io, reason, actor);
    return { assignedTokens: [], snapshot };
  }

  const now = new Date();

  const assignments = selected.map((token, index) => ({
    token,
    counter: freeCounters[index],
  }));

  await Token.bulkWrite(
    assignments.map((entry) => ({
      updateOne: {
        filter: { _id: entry.token._id },
        update: {
          $set: {
            status: TOKEN_STATUS.SERVING,
            startedAt: now,
            assignedCounterId: entry.counter.counterId,
            predictedCounterId: entry.counter.counterId,
            predictedStartAt: now,
            notifiedNearTurn: false,
          },
        },
      },
    })),
  );

  for (const entry of assignments) {
    entry.counter.servingToken = entry.token._id;
    entry.counter.startedAt = now;

    if (entry.token.priority === "priority") {
      state.consecutivePriorityServed += 1;
    } else {
      state.consecutivePriorityServed = 0;
    }

    await logQueueEvent({
      eventType: QUEUE_EVENT_TYPES.COUNTER_ASSIGNED,
      tokenId: entry.token._id,
      actor,
      metadata: {
        counterId: entry.counter.counterId,
        reason,
      },
    });
  }

  state.currentServingToken =
    assignments[0]?.token?._id || state.currentServingToken;
  await state.save();

  clearCache("queue:");

  const snapshot = await buildQueueSnapshot({ forceRefresh: true });

  if (io) {
    for (const entry of assignments) {
      io.emit(SOCKET_EVENTS.TOKEN_STATUS_CHANGED, {
        tokenId: entry.token._id,
        tokenNumber: entry.token.tokenNumber,
        displayToken: entry.token.displayToken,
        status: TOKEN_STATUS.SERVING,
        assignedCounterId: entry.counter.counterId,
        reason,
      });

      io.to(`token:${entry.token._id.toString()}`).emit(
        SOCKET_EVENTS.TOKEN_STATUS,
        {
          type: TOKEN_STATUS.SERVING,
          tokenNumber: entry.token.tokenNumber,
          displayToken: entry.token.displayToken,
          assignedCounterId: entry.counter.counterId,
          message: `It is now your turn: ${entry.token.displayToken}.`,
        },
      );

      if (entry.token.deviceId) {
        io.to(`device:${entry.token.deviceId}`).emit(
          SOCKET_EVENTS.TOKEN_STATUS,
          {
            type: TOKEN_STATUS.SERVING,
            tokenNumber: entry.token.tokenNumber,
            displayToken: entry.token.displayToken,
            assignedCounterId: entry.counter.counterId,
            message: `It is now your turn: ${entry.token.displayToken}.`,
          },
        );
      }
    }
  }

  await emitQueueSnapshot({
    io,
    snapshot,
    reason,
    reorderChanged: snapshot.reorderChanged,
    actor,
  });

  return {
    assignedTokens: assignments.map((entry) => ({
      ...entry.token,
      status: TOKEN_STATUS.SERVING,
      assignedCounterId: entry.counter.counterId,
      startedAt: now,
    })),
    snapshot,
  };
};

export const getQueueConfig = async () => {
  const config = await getOrCreateConfig();
  return toPlain(config);
};

export const updateQueueConfig = async (partialConfig, io, actor = null) => {
  const config = await getOrCreateConfig();

  const allowedFields = [
    "averageServiceMinutes",
    "maxPriorityStreak",
    "maxPriorityShare",
    "priorityWeight",
    "starvationThresholdMinutes",
    "nearTurnThreshold",
    "activeCounters",
    "enableDynamicReordering",
    "autoServeNext",
    "cacheTtlMs",
    "historicalSampleSize",
  ];

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(partialConfig, field)) {
      config[field] = partialConfig[field];
    }
  }

  await config.save();

  await logQueueEvent({
    eventType: QUEUE_EVENT_TYPES.FLOW_UPDATED,
    actor,
    metadata: partialConfig,
  });

  if (config.autoServeNext) {
    await assignToAvailableCounters({ io, reason: "flow_updated", actor });
  } else {
    await syncQueueAndBroadcast(io, "flow_updated", actor);
  }

  return toPlain(config);
};

export const createTokenEntry = async (
  {
    name,
    phone,
    isPriority = false,
    priorityReason = null,
    priority,
    includeQr = false,
    deviceId = null,
  },
  io,
  actor = null,
) => {
  const config = await getOrCreateConfig();
  const state = await getOrCreateState(config);

  const incrementedState = await QueueState.findOneAndUpdate(
    { _id: state._id },
    { $inc: { lastTokenNumber: 1 } },
    { new: true },
  );

  const tokenNumber = incrementedState.lastTokenNumber;

  const tokenPayload = {
    tokenNumber,
    displayToken: buildDisplayToken(tokenNumber),
    name,
    phone,
    isPriority,
    priorityReason,
    priority,
    status: TOKEN_STATUS.WAITING,
    notifiedNearTurn: false,
    deviceId,
  };

  const token = await Token.create(tokenPayload);

  if (includeQr) {
    const frontendUrl = process.env.FRONTEND_URL?.split(",")[0] || null;
    token.qrCodeDataUrl = await createTokenQrDataUrl(token, frontendUrl);
    await token.save();
  }

  await logQueueEvent({
    eventType: QUEUE_EVENT_TYPES.TOKEN_CREATED,
    tokenId: token._id,
    actor,
    metadata: {
      name: token.name,
      phone: token.phone,
      priority: token.priority,
      isPriority: token.isPriority,
      priorityReason: token.priorityReason,
      includeQr,
      deviceId,
    },
  });

  if (io) {
    io.emit(SOCKET_EVENTS.TOKEN_CREATED, {
      token: toPlain(token),
    });

    if (deviceId) {
      io.to(`device:${deviceId}`).emit(SOCKET_EVENTS.TOKEN_CREATED, {
        token: toPlain(token),
      });
    }
  }

  clearCache("queue:");

  if (config.autoServeNext) {
    await assignToAvailableCounters({
      io,
      reason: "token_created",
      actor,
    });
  } else {
    await syncQueueAndBroadcast(io, "token_created", actor);
  }

  return toPlain(await Token.findById(token._id));
};

export const startNextToken = async (io, actor = null) => {
  const { assignedTokens } = await assignToAvailableCounters({
    io,
    reason: "manual_advance",
    actor,
  });

  return assignedTokens[0] || null;
};

export const getTokenByNumber = async (tokenNumber) => {
  const parsedTokenNumber = Number(tokenNumber);

  if (!Number.isInteger(parsedTokenNumber) || parsedTokenNumber <= 0) {
    return null;
  }

  const token = await Token.findOne({ tokenNumber: parsedTokenNumber }).lean();

  if (!token) {
    return null;
  }

  const snapshot = await buildQueueSnapshot();
  const queueToken = snapshot.queue.find((item) =>
    isSameId(item._id, token._id),
  );

  return {
    ...token,
    position: queueToken ? queueToken.position : null,
    estimatedWaitMinutes: queueToken ? queueToken.estimatedWaitMinutes : 0,
    queueSize: snapshot.queue.length,
    activeCounters: snapshot.summary.activeCounterCount,
  };
};

export const getTokenQrByNumber = async (tokenNumber) => {
  const parsedTokenNumber = Number(tokenNumber);

  if (!Number.isInteger(parsedTokenNumber) || parsedTokenNumber <= 0) {
    return null;
  }

  const token = await Token.findOne({ tokenNumber: parsedTokenNumber });

  if (!token) {
    return null;
  }

  if (!token.qrCodeDataUrl) {
    const frontendUrl = process.env.FRONTEND_URL?.split(",")[0] || null;
    token.qrCodeDataUrl = await createTokenQrDataUrl(token, frontendUrl);
    await token.save();
  }

  return {
    tokenNumber: token.tokenNumber,
    displayToken: token.displayToken,
    qrCodeDataUrl: token.qrCodeDataUrl,
  };
};

export const updateTokenStatus = async (
  tokenId,
  targetStatus,
  io,
  actor = null,
) => {
  if (![TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED].includes(targetStatus)) {
    throw new AppError("Invalid target status.", 400);
  }

  const token = await Token.findById(tokenId);

  if (!token) {
    return null;
  }

  if ([TOKEN_STATUS.COMPLETED, TOKEN_STATUS.SKIPPED].includes(token.status)) {
    await syncQueueAndBroadcast(io, "token_status_noop", actor);
    return toPlain(token);
  }

  const now = new Date();
  const wasServing = token.status === TOKEN_STATUS.SERVING;

  token.status = targetStatus;
  token.notifiedNearTurn = false;

  if (targetStatus === TOKEN_STATUS.COMPLETED) {
    token.completedAt = now;
  }

  if (targetStatus === TOKEN_STATUS.SKIPPED) {
    token.skippedAt = now;
  }

  if (token.startedAt) {
    token.waitDurationSeconds = Math.max(
      0,
      Math.round(
        (token.startedAt.getTime() - token.createdAt.getTime()) / 1000,
      ),
    );

    token.serviceDurationSeconds = Math.max(
      0,
      Math.round((now.getTime() - token.startedAt.getTime()) / 1000),
    );
  }

  await token.save();

  if (wasServing) {
    const config = await getOrCreateConfig();
    const state = await getOrCreateState(config);

    for (const counter of state.counters) {
      if (counter.servingToken && isSameId(counter.servingToken, token._id)) {
        counter.servingToken = null;
        counter.startedAt = null;
        counter.servedCount += 1;

        if (token.serviceDurationSeconds > 0) {
          const previousAverage = Number(counter.avgServiceSeconds || 0);
          counter.avgServiceSeconds =
            previousAverage > 0
              ? Number(
                  (
                    (previousAverage + token.serviceDurationSeconds) /
                    2
                  ).toFixed(2),
                )
              : token.serviceDurationSeconds;
        }
      }
    }

    state.currentServingToken = null;
    await state.save();
  }

  await logQueueEvent({
    eventType: QUEUE_EVENT_TYPES.TOKEN_STATUS_CHANGED,
    tokenId: token._id,
    actor,
    metadata: {
      status: targetStatus,
      assignedCounterId: token.assignedCounterId,
      serviceDurationSeconds: token.serviceDurationSeconds,
    },
  });

  if (io) {
    io.emit(SOCKET_EVENTS.TOKEN_STATUS_CHANGED, {
      tokenId: token._id,
      tokenNumber: token.tokenNumber,
      displayToken: token.displayToken,
      status: targetStatus,
      serviceDurationSeconds: token.serviceDurationSeconds,
      waitDurationSeconds: token.waitDurationSeconds,
    });

    io.to(`token:${token._id.toString()}`).emit(SOCKET_EVENTS.TOKEN_STATUS, {
      type: targetStatus,
      tokenNumber: token.tokenNumber,
      displayToken: token.displayToken,
      message:
        targetStatus === TOKEN_STATUS.COMPLETED
          ? `${token.displayToken} has been completed.`
          : `${token.displayToken} has been skipped by the desk.`,
    });

    if (token.deviceId) {
      io.to(`device:${token.deviceId}`).emit(SOCKET_EVENTS.TOKEN_STATUS, {
        type: targetStatus,
        tokenNumber: token.tokenNumber,
        displayToken: token.displayToken,
        message:
          targetStatus === TOKEN_STATUS.COMPLETED
            ? `${token.displayToken} has been completed.`
            : `${token.displayToken} has been skipped by the desk.`,
      });
    }
  }

  const config = await getOrCreateConfig();

  if (config.autoServeNext) {
    await assignToAvailableCounters({
      io,
      reason: "token_status_changed",
      actor,
    });
  } else {
    await syncQueueAndBroadcast(io, "token_status_changed", actor);
  }

  return toPlain(token);
};

export const prioritizeToken = async (tokenId, boost, io, actor = null) => {
  const token = await Token.findById(tokenId);

  if (!token) {
    return null;
  }

  if (token.status !== TOKEN_STATUS.WAITING) {
    throw new AppError("Only waiting tokens can be manually prioritized.", 400);
  }

  token.priority = "priority";
  token.manualPriorityBoost =
    Number(token.manualPriorityBoost || 0) + Number(boost || 2);
  token.notifiedNearTurn = false;
  await token.save();

  await logQueueEvent({
    eventType: QUEUE_EVENT_TYPES.TOKEN_PRIORITIZED,
    tokenId: token._id,
    actor,
    metadata: {
      boost: token.manualPriorityBoost,
    },
  });

  clearCache("queue:");

  await syncQueueAndBroadcast(io, "manual_prioritize", actor);

  return toPlain(token);
};

export const getQueueStats = async () => {
  const cachedStats = getCacheValue(CACHE_KEYS.STATS);

  if (cachedStats) {
    return cachedStats;
  }

  const [
    totalTokens,
    activeTokens,
    completedTokens,
    skippedTokens,
    durationAverages,
    distribution,
    config,
    state,
    recentEvents,
  ] = await Promise.all([
    Token.countDocuments(),
    Token.countDocuments({
      status: { $in: [TOKEN_STATUS.WAITING, TOKEN_STATUS.SERVING] },
    }),
    Token.countDocuments({ status: TOKEN_STATUS.COMPLETED }),
    Token.countDocuments({ status: TOKEN_STATUS.SKIPPED }),
    Token.aggregate([
      { $match: { status: TOKEN_STATUS.COMPLETED } },
      {
        $group: {
          _id: null,
          averageWaitSeconds: { $avg: "$waitDurationSeconds" },
          averageServiceSeconds: { $avg: "$serviceDurationSeconds" },
        },
      },
    ]),
    Token.aggregate([
      {
        $group: {
          _id: null,
          priorityTokens: {
            $sum: { $cond: [{ $eq: ["$priority", "priority"] }, 1, 0] },
          },
          normalTokens: {
            $sum: { $cond: [{ $eq: ["$priority", "normal"] }, 1, 0] },
          },
          activePriorityTokens: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$priority", "priority"] },
                    {
                      $in: [
                        "$status",
                        [TOKEN_STATUS.WAITING, TOKEN_STATUS.SERVING],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
          activeNormalTokens: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$priority", "normal"] },
                    {
                      $in: [
                        "$status",
                        [TOKEN_STATUS.WAITING, TOKEN_STATUS.SERVING],
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    getOrCreateConfig(),
    getOrCreateState(await getOrCreateConfig()),
    Token.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
    }),
  ]);

  const duration = durationAverages[0] || {
    averageWaitSeconds: Number(config.averageServiceMinutes) * 60,
    averageServiceSeconds: Number(config.averageServiceMinutes) * 60,
  };

  const distributionSnapshot = distribution[0] || {
    priorityTokens: 0,
    normalTokens: 0,
    activePriorityTokens: 0,
    activeNormalTokens: 0,
  };

  const completionRate = totalTokens
    ? Number(((completedTokens / totalTokens) * 100).toFixed(1))
    : 0;

  const skipRate = totalTokens
    ? Number(((skippedTokens / totalTokens) * 100).toFixed(1))
    : 0;

  const stats = {
    totalTokens,
    activeTokens,
    completedTokens,
    skippedTokens,
    averageWaitTime: Number(
      (Number(duration.averageWaitSeconds || 0) / 60).toFixed(1),
    ),
    averageServiceTime: Number(
      (Number(duration.averageServiceSeconds || 0) / 60).toFixed(1),
    ),
    completionRate,
    skipRate,
    recentActivityLastHour: recentEvents,
    activeCounters: getActiveCounters(state).length,
    distribution: {
      priorityTokens: distributionSnapshot.priorityTokens,
      normalTokens: distributionSnapshot.normalTokens,
      activePriorityTokens: distributionSnapshot.activePriorityTokens,
      activeNormalTokens: distributionSnapshot.activeNormalTokens,
    },
    config: toPlain(config),
  };

  setCacheValue(
    CACHE_KEYS.STATS,
    stats,
    Math.max(1000, Number(config.cacheTtlMs || 1500)),
  );

  return stats;
};

export const getQueueAnalytics = async ({ hours = 24 } = {}) => {
  return buildQueueAnalytics({ hours });
};

export const getQueueEventLogs = async ({ limit, eventType }) => {
  return getRecentQueueEvents({ limit, eventType });
};

export const bootstrapQueue = async (io) => {
  const config = await getOrCreateConfig();
  const state = await getOrCreateState(config);

  let changed = ensureCounterTopology(state, config);

  if (changed) {
    await state.save();
  }

  if (config.autoServeNext) {
    await assignToAvailableCounters({
      io,
      reason: "bootstrap",
      actor: { role: "system" },
    });
    return;
  }

  await syncQueueAndBroadcast(io, "bootstrap", { role: "system" });
};
