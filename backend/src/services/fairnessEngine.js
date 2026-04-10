const toTimestamp = (dateValue) => new Date(dateValue).getTime();

const getWaitingMinutes = (token, now) => {
  const createdAt = toTimestamp(token.createdAt || now);
  return Math.max(0, (now.getTime() - createdAt) / 60000);
};

const clamp = (value, min, max) => {
  return Math.min(max, Math.max(min, value));
};

const scoreToken = ({ token, now, config, queuePressure }) => {
  const waitingMinutes = getWaitingMinutes(token, now);
  const basePriorityWeight = Number(config.priorityWeight || 1);
  const starvationThreshold = Number(config.starvationThresholdMinutes || 8);

  const priorityBoost =
    token.priority === "priority"
      ? 90 * basePriorityWeight * clamp(1 - queuePressure * 0.2, 0.6, 1.2)
      : 0;

  const ageBoost = waitingMinutes * 5;

  const starvationBoost =
    token.priority === "normal" && waitingMinutes >= starvationThreshold
      ? (waitingMinutes - starvationThreshold + 1) * 16
      : 0;

  const manualBoost = Number(token.manualPriorityBoost || 0) * 45;

  const score = priorityBoost + ageBoost + starvationBoost + manualBoost;

  return {
    ...token,
    _waitingMinutes: waitingMinutes,
    _engineScore: Number(score.toFixed(4)),
  };
};

const sortByScore = (a, b) => {
  if (b._engineScore !== a._engineScore) {
    return b._engineScore - a._engineScore;
  }

  const timeDiff = toTimestamp(a.createdAt) - toTimestamp(b.createdAt);

  if (timeDiff !== 0) {
    return timeDiff;
  }

  return Number(a.tokenNumber) - Number(b.tokenNumber);
};

export const rankWaitingTokens = ({
  tokens,
  config,
  state,
  activeCounterCount,
  now = new Date(),
}) => {
  const safeCounterCount = Math.max(1, Number(activeCounterCount) || 1);
  const queuePressure = tokens.length / (safeCounterCount * 8);

  const scored = tokens
    .map((token) => scoreToken({ token, now, config, queuePressure }))
    .sort(sortByScore);

  const priorityPool = scored.filter((token) => token.priority === "priority");
  const normalPool = scored.filter((token) => token.priority === "normal");

  const maxPriorityStreak = Number(config.maxPriorityStreak || 2);
  const maxPriorityShare = Number(config.maxPriorityShare || 0.7);
  const starvationThreshold = Number(config.starvationThresholdMinutes || 8);

  let priorityStreak = Number(state.consecutivePriorityServed || 0);
  let plannedPriority = 0;
  const ordered = [];

  const pickFromPool = (pool) => {
    if (!pool.length) {
      return null;
    }

    return pool.shift();
  };

  while (priorityPool.length || normalPool.length) {
    let chosenToken = null;

    if (!priorityPool.length) {
      chosenToken = pickFromPool(normalPool);
    } else if (!normalPool.length) {
      chosenToken = pickFromPool(priorityPool);
    } else {
      const priorityCandidate = priorityPool[0];
      const normalCandidate = normalPool[0];

      const currentPriorityShare = ordered.length
        ? plannedPriority / ordered.length
        : 0;

      const normalStarving =
        normalCandidate._waitingMinutes >= starvationThreshold &&
        priorityStreak > 0;

      const forceNormal =
        priorityStreak >= maxPriorityStreak ||
        normalStarving ||
        (ordered.length >= 3 && currentPriorityShare >= maxPriorityShare);

      if (forceNormal) {
        chosenToken = pickFromPool(normalPool);
      } else if (
        priorityCandidate._engineScore >=
        normalCandidate._engineScore * 0.92
      ) {
        chosenToken = pickFromPool(priorityPool);
      } else {
        chosenToken = pickFromPool(normalPool);
      }
    }

    if (!chosenToken) {
      break;
    }

    if (chosenToken.priority === "priority") {
      priorityStreak += 1;
      plannedPriority += 1;
    } else {
      priorityStreak = 0;
    }

    ordered.push(chosenToken);
  }

  return {
    ordered,
    diagnostics: {
      queuePressure: Number(queuePressure.toFixed(3)),
      plannedPriority,
      totalPlanned: ordered.length,
      endingPriorityStreak: priorityStreak,
    },
  };
};
