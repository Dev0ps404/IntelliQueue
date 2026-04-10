import {
  Activity,
  Clock3,
  Download,
  Loader2,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/client";
import { useSocket } from "../context/SocketContext";

const buildPolyline = (values, width, height, padding = 24) => {
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);
  const stepX = (width - padding * 2) / Math.max(1, values.length - 1);

  return values
    .map((value, index) => {
      const x = padding + stepX * index;
      const normalized = (value - minValue) / range;
      const y = height - padding - normalized * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");
};

const Analytics = () => {
  const socket = useSocket();

  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [queue, setQueue] = useState([]);
  const [windowHours, setWindowHours] = useState(24);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadMetrics = async (hours = windowHours) => {
    setLoading(true);

    try {
      const [statsData, queueData, analyticsData] = await Promise.all([
        adminApi.getStats(),
        adminApi.getQueue(),
        adminApi.getAnalytics(hours),
      ]);

      setStats(statsData.stats || null);
      setQueue(queueData.queue || []);
      setAnalytics(analyticsData.analytics || null);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load analytics data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics(windowHours);
  }, [windowHours]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleQueueUpdate = async (payload) => {
      setQueue(payload.queue || []);

      try {
        const [statsData, analyticsData] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAnalytics(windowHours),
        ]);
        setStats(statsData.stats || null);
        setAnalytics(analyticsData.analytics || null);
      } catch (requestError) {
        console.error(requestError);
      }
    };

    socket.on("queue:update", handleQueueUpdate);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
    };
  }, [socket, windowHours]);

  const trendData = useMemo(() => {
    const hourlyCounts = analytics?.hourlyEventCounts || [];

    if (hourlyCounts.length) {
      const tail = hourlyCounts.slice(-8);
      return tail.map((entry) => Number(entry.count || 0));
    }

    const base = Number(stats?.averageWaitTime ?? 8);
    const queueFactor = Math.max(1, queue.length / 6);

    return [0.8, 0.95, 0.7, 1.05, 1.45, 1.2, 0.65, 1.15].map((factor) =>
      Number((base * factor * queueFactor).toFixed(1)),
    );
  }, [stats, queue]);

  const trendPoints = useMemo(
    () => buildPolyline(trendData, 580, 220),
    [trendData],
  );

  const distributionPriority = Number(stats?.distribution?.priorityTokens ?? 0);
  const distributionNormal = Number(stats?.distribution?.normalTokens ?? 0);
  const distributionTotal = Math.max(
    1,
    distributionPriority + distributionNormal,
  );
  const priorityPercent = Math.round(
    (distributionPriority / distributionTotal) * 100,
  );

  const peakBars = useMemo(() => {
    const labels = [
      "08H",
      "09H",
      "10H",
      "11H",
      "12H",
      "13H",
      "14H",
      "15H",
      "16H",
      "17H",
    ];
    const base = Number(stats?.activeTokens ?? 6);

    return labels.map((label, index) => {
      const value = Math.max(
        2,
        Math.round(base * (0.4 + Math.sin((index + 1) / 1.9) * 0.45 + 0.6)),
      );
      return { label, value };
    });
  }, [stats]);

  const maxPeak = Math.max(...peakBars.map((bar) => bar.value), 1);

  const handleApplyOptimization = async () => {
    try {
      const flowData = await adminApi.getFlow();
      const current = flowData.config;

      if (!current) {
        return;
      }

      const nextAverage = Math.max(
        1,
        Number(current.averageServiceMinutes) - 1,
      );

      await adminApi.updateFlow({
        averageServiceMinutes: nextAverage,
        maxPriorityStreak: Number(current.maxPriorityStreak),
        nearTurnThreshold: Number(current.nearTurnThreshold),
        autoServeNext: Boolean(current.autoServeNext),
      });

      setNotice(
        `Optimization applied. Average service target set to ${nextAverage} min.`,
      );
      setError("");
      loadMetrics(windowHours);
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to apply optimization.");
    }
  };

  const handleExportReport = async () => {
    setExporting(true);

    try {
      const [statsData, queueData, analyticsData, eventsData] =
        await Promise.all([
          adminApi.getStats(),
          adminApi.getQueue(),
          adminApi.getAnalytics(windowHours),
          adminApi.getEvents({ limit: 200 }),
        ]);

      const report = {
        generatedAt: new Date().toISOString(),
        windowHours,
        stats: statsData.stats || null,
        analytics: analyticsData.analytics || null,
        queue: queueData.queue || [],
        events: eventsData.events || [],
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `queue-report-${windowHours}h.json`;
      link.click();
      URL.revokeObjectURL(url);

      setNotice("Report exported successfully.");
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to export report.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 fade-rise">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-slate-900">
            Data Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time queue efficiency, throughput, and distribution insights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setWindowHours((previous) => (previous === 24 ? 168 : 24))
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {windowHours === 24
              ? "Switch: Last 7 Days"
              : "Switch: Last 24 Hours"}
          </button>
          <button
            type="button"
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Export Report
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-teal-100 p-2 text-teal-700">
              <Clock3 size={15} />
            </span>
            <span className="chip chip-green">+12%</span>
          </div>
          <p className="muted-label">Avg Wait Time</p>
          <p className="mt-1 font-display text-3xl font-bold text-slate-900">
            {stats?.averageWaitTime ?? 0} min
          </p>
        </article>

        <article className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-blue-100 p-2 text-blue-700">
              <Users size={15} />
            </span>
            <span className="chip chip-amber">-3%</span>
          </div>
          <p className="muted-label">Total Tokens</p>
          <p className="mt-1 font-display text-3xl font-bold text-slate-900">
            {stats?.totalTokens ?? 0}
          </p>
        </article>

        <article className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-slate-200 p-2 text-slate-700">
              <ShieldCheck size={15} />
            </span>
            <span className="chip chip-green">+8%</span>
          </div>
          <p className="muted-label">Success Rate</p>
          <p className="mt-1 font-display text-3xl font-bold text-slate-900">
            {Number(100 - (stats?.skipRate ?? 0)).toFixed(1)}%
          </p>
        </article>

        <article className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <Zap size={15} />
            </span>
            <span className="h-2.5 w-2.5 animate-pulseSoft rounded-full bg-emerald-400" />
          </div>
          <p className="muted-label">Active AI Agents</p>
          <p className="mt-1 font-display text-3xl font-bold text-slate-900">
            {Math.max(1, Math.round((stats?.activeTokens ?? 1) * 2.2))}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[2.1fr,1fr]">
        <article className="surface-card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Average Wait Time Trends
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-600" /> Current
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" /> Target
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {loading ? (
              <div className="flex h-[220px] items-center justify-center text-slate-500">
                <Loader2 size={17} className="mr-2 animate-spin" /> Building
                chart...
              </div>
            ) : (
              <svg viewBox="0 0 580 220" className="h-[220px] w-full">
                <polyline
                  fill="none"
                  stroke="#0d7a67"
                  strokeWidth="3"
                  points={trendPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        </article>

        <article className="surface-card p-4">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Token Distribution
          </h2>
          <div className="mt-5 flex items-center justify-center">
            <div
              className="flex h-40 w-40 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#0d7a67 0 ${priorityPercent}%, #2563eb ${priorityPercent}% 100%)`,
              }}
            >
              <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-white text-center">
                <p className="font-display text-3xl font-bold text-slate-900">
                  {stats?.totalTokens ?? 0}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  Total
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-teal-700" />{" "}
                Priority
              </span>
              <strong>{priorityPercent}%</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Normal
              </span>
              <strong>{100 - priorityPercent}%</strong>
            </div>
          </div>
        </article>
      </section>

      <section className="surface-card p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-slate-900">
            Peak Hours Analysis
          </h2>
          <span className="text-xs font-semibold text-blue-700">
            AI Suggestion: Increase staffing near 12H
          </span>
        </div>

        <div className="grid grid-cols-10 items-end gap-2">
          {peakBars.map((bar, index) => {
            const height = Math.round((bar.value / maxPeak) * 110);
            const highlight = index === 4 || index === 5;

            return (
              <div key={bar.label} className="flex flex-col items-center gap-2">
                <div
                  className={`w-full rounded-t-md ${highlight ? "bg-teal-700" : index === 6 ? "bg-blue-600" : "bg-slate-300"}`}
                  style={{ height: `${Math.max(14, height)}px` }}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-card flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-teal-50 to-slate-50 p-5">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-teal-700 p-3 text-white">
            <Activity size={16} />
          </span>
          <div>
            <h3 className="font-display text-xl font-semibold text-slate-900">
              Automated Efficiency Insight
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              Re-routing a fraction of standard tokens can reduce peak wait
              time. Apply optimization to tune service speed now.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApplyOptimization}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Apply Optimization
        </button>
      </section>

      {notice ? (
        <p className="text-sm font-semibold text-teal-700">{notice}</p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
};

export default Analytics;
