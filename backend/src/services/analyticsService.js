import QueueEvent from "../models/QueueEvent.js";
import Token from "../models/Token.js";
import { TOKEN_STATUS } from "../config/constants.js";

export const getHistoricalServiceAverages = async ({
  sampleSize = 150,
  fallbackServiceSeconds = 240,
}) => {
  const metrics = await Token.aggregate([
    {
      $match: {
        status: TOKEN_STATUS.COMPLETED,
        serviceDurationSeconds: { $gt: 0 },
      },
    },
    { $sort: { completedAt: -1 } },
    { $limit: sampleSize },
    {
      $group: {
        _id: null,
        avgServiceSeconds: { $avg: "$serviceDurationSeconds" },
        avgWaitSeconds: { $avg: "$waitDurationSeconds" },
        sampleCount: { $sum: 1 },
      },
    },
  ]);

  const entry = metrics[0] || {
    avgServiceSeconds: fallbackServiceSeconds,
    avgWaitSeconds: fallbackServiceSeconds,
    sampleCount: 0,
  };

  return {
    avgServiceSeconds: Math.max(
      30,
      Number(entry.avgServiceSeconds || fallbackServiceSeconds),
    ),
    avgWaitSeconds: Math.max(
      0,
      Number(entry.avgWaitSeconds || fallbackServiceSeconds),
    ),
    sampleCount: Number(entry.sampleCount || 0),
  };
};

export const buildQueueAnalytics = async ({ hours = 24 }) => {
  const boundedHours = Math.max(1, Math.min(168, Number(hours) || 24));
  const startDate = new Date(Date.now() - boundedHours * 60 * 60 * 1000);

  const [
    eventBreakdown,
    tokenStatusBreakdown,
    priorityBreakdown,
    hourlyEvents,
  ] = await Promise.all([
    QueueEvent.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Token.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Token.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
    QueueEvent.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            hour: {
              $dateToString: {
                format: "%Y-%m-%dT%H:00:00Z",
                date: "$createdAt",
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.hour": 1 } },
    ]),
  ]);

  const toMap = (items) =>
    items.reduce((acc, current) => {
      acc[current._id || "unknown"] = current.count;
      return acc;
    }, {});

  return {
    windowHours: boundedHours,
    eventBreakdown: toMap(eventBreakdown),
    tokenStatusBreakdown: toMap(tokenStatusBreakdown),
    priorityBreakdown: toMap(priorityBreakdown),
    hourlyEventCounts: hourlyEvents.map((item) => ({
      hour: item._id.hour,
      count: item.count,
    })),
  };
};
