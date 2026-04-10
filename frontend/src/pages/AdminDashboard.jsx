import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  Search,
  SkipForward,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { formatWaitLabel } from "../utils/format";

const FIRST_NAMES = [
  "Elena",
  "Jordan",
  "Marcus",
  "Noah",
  "Sarah",
  "Maya",
  "Aarav",
  "Ivy",
];
const LAST_NAMES = [
  "Kendrick",
  "Dixon",
  "Webb",
  "Mehta",
  "Mitchell",
  "Rao",
  "Shaw",
  "Cole",
];

const buildPseudoName = (tokenNumber) => {
  const safe = Number(tokenNumber) || 1;
  return `${FIRST_NAMES[safe % FIRST_NAMES.length]} ${LAST_NAMES[safe % LAST_NAMES.length]}`;
};

const AdminDashboard = () => {
  const socket = useSocket();

  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyTokenId, setBusyTokenId] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const [queueData, statsData] = await Promise.all([
        adminApi.getQueue(),
        adminApi.getStats(),
      ]);

      setQueue(queueData.queue || []);
      setStats(statsData.stats || null);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to load queue management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.emit("join-admin-room");

    const handleQueueUpdate = async (payload) => {
      setQueue(payload.queue || []);

      try {
        const statsData = await adminApi.getStats();
        setStats(statsData.stats || null);
      } catch (requestError) {
        console.error(requestError);
      }
    };

    socket.on("queue:update", handleQueueUpdate);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
    };
  }, [socket]);

  const filteredQueue = useMemo(() => {
    if (!searchTerm.trim()) {
      return queue;
    }

    const keyword = searchTerm.trim().toLowerCase();

    return queue.filter((item) => {
      const pseudoName = buildPseudoName(item.tokenNumber).toLowerCase();

      return (
        item.displayToken.toLowerCase().includes(keyword) ||
        item.priority.toLowerCase().includes(keyword) ||
        item.status.toLowerCase().includes(keyword) ||
        pseudoName.includes(keyword)
      );
    });
  }, [queue, searchTerm]);

  const handleTokenAction = async (token, status) => {
    setBusyTokenId(token._id);

    try {
      await adminApi.updateTokenStatus(token._id, status);
      setNotice(`${token.displayToken} marked as ${status}.`);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to update token status.");
    } finally {
      setBusyTokenId(null);
    }
  };

  const handleAdvance = async () => {
    try {
      const response = await adminApi.advanceQueue();
      setNotice(response.message || "Queue advanced.");
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to advance queue.");
    }
  };

  return (
    <div className="space-y-6 fade-rise">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-bold text-slate-900">
            Queue Management
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Real-time adaptive routing for active service tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2">
            <p className="muted-label">Active Now</p>
            <p className="mt-1 text-xl font-bold text-teal-700">
              {stats?.activeTokens ?? 0}
              <span className="text-sm text-slate-400">
                {" "}
                / {stats?.totalTokens ?? 0}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2">
            <p className="muted-label">Avg Wait</p>
            <p className="mt-1 text-xl font-bold text-blue-700">
              {stats?.averageWaitTime ?? 0} min
            </p>
          </div>
        </div>
      </section>

      <section className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 md:px-6">
          <div className="relative w-full max-w-xl">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search tokens or users..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none ring-teal-500 focus:ring"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAdvance}
              className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-700"
            >
              Advance
            </button>
            <button
              type="button"
              onClick={loadDashboard}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.08em] text-slate-500">
              <tr>
                <th className="px-4 py-3 md:px-6">Token ID</th>
                <th className="px-4 py-3">User Name</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Wait Time</th>
                <th className="px-4 py-3 text-right md:px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Loading
                      queue records...
                    </span>
                  </td>
                </tr>
              ) : filteredQueue.length ? (
                filteredQueue.map((item) => {
                  const busy = busyTokenId === item._id;
                  const canComplete = item.status === "serving";
                  const canSkip =
                    item.status === "waiting" || item.status === "serving";

                  return (
                    <tr
                      key={item._id}
                      className={
                        item.priority === "priority"
                          ? "bg-amber-50/40"
                          : "bg-white"
                      }
                    >
                      <td className="px-4 py-4 font-semibold text-slate-900 md:px-6">
                        #{item.displayToken}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {buildPseudoName(item.tokenNumber)}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`chip ${item.priority === "priority" ? "chip-amber" : "chip-slate"}`}
                        >
                          {item.priority === "priority"
                            ? "High Priority"
                            : "Standard"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`chip ${item.status === "serving" ? "chip-green" : "chip-blue"}`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {formatWaitLabel(item.estimatedWaitMinutes)}
                      </td>
                      <td className="px-4 py-4 md:px-6">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleTokenAction(item, "completed")}
                            disabled={!canComplete || busy}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-emerald-700 disabled:opacity-35"
                            aria-label="Complete token"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTokenAction(item, "skipped")}
                            disabled={!canSkip || busy}
                            className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 disabled:opacity-35"
                            aria-label="Skip token"
                          >
                            <SkipForward size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    No matching queue entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
        <article className="surface-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-blue-600" />
            <h3 className="font-display text-lg font-semibold">
              Intelligence Stream
            </h3>
          </div>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Predictive load balancing active.</span>
              <span className="chip chip-green">Live</span>
            </li>
            <li className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <span>Automated fairness for mixed priority queue.</span>
              <span className="chip chip-blue">Auto</span>
            </li>
          </ul>
          <Link
            to="/settings"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-teal-700"
          >
            Adjust settings
            <ChevronRight size={14} />
          </Link>
        </article>

        <article className="surface-card bg-gradient-to-br from-teal-700 to-emerald-500 p-5 text-white">
          <p className="muted-label text-teal-100">Throughput Velocity</p>
          <p className="mt-3 font-display text-5xl font-bold">
            +{Math.round(stats?.completionRate ?? 0)}%
          </p>
          <p className="mt-2 text-sm text-teal-50">
            Above average trend from current completion ratio.
          </p>
        </article>
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

export default AdminDashboard;
