import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { tokenApi } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { formatWaitLabel } from "../utils/format";

const QueueStatus = () => {
  const socket = useSocket();

  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({
    totalInQueue: 0,
    servingToken: null,
  });
  const [loading, setLoading] = useState(true);

  const loadQueue = async () => {
    setLoading(true);

    try {
      const response = await tokenApi.getQueue();
      setQueue(response.queue || []);
      setSummary(response.summary || { totalInQueue: 0, servingToken: null });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleQueueUpdate = (payload) => {
      setQueue(payload.queue || []);
      setSummary(payload.summary || { totalInQueue: 0, servingToken: null });
    };

    socket.on("queue:update", handleQueueUpdate);

    return () => {
      socket.off("queue:update", handleQueueUpdate);
    };
  }, [socket]);

  const waitingQueue = useMemo(
    () =>
      queue.filter(
        (item) => item.status === "waiting" || item.status === "serving",
      ),
    [queue],
  );

  return (
    <div className="space-y-6 fade-rise">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold text-slate-900">
            Live Queue Matrix
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitoring adaptive token flow in real time.
          </p>
        </div>
        <span className="chip chip-green">Engine: Optimized</span>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.05fr,1.45fr]">
        <article className="surface-card p-5">
          <p className="muted-label">Active Session</p>
          <p className="mt-3 font-display text-5xl font-bold text-slate-900">
            {summary.servingToken?.displayToken || "-"}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-700">
            <span className="h-2 w-2 rounded-full bg-teal-600" />
            Now Serving
          </p>
        </article>

        <article className="surface-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="muted-label">Next In Pipeline</p>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
              <p className="muted-label">Est. Wait</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">
                {waitingQueue[1]
                  ? formatWaitLabel(waitingQueue[1].estimatedWaitMinutes)
                  : "-"}
              </p>
            </div>
          </div>

          <p className="font-display text-4xl font-bold text-slate-900">
            {waitingQueue[1]?.displayToken ||
              waitingQueue[0]?.displayToken ||
              "-"}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span
              className={`chip ${waitingQueue[1]?.priority === "priority" ? "chip-amber" : "chip-slate"}`}
            >
              {waitingQueue[1]?.priority || "normal"}
            </span>
            <span className="chip chip-blue">Queue Pending</span>
          </div>
        </article>
      </section>

      <section className="surface-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="muted-label">
            Upcoming Tokens ({summary.totalInQueue})
          </p>
          <button
            type="button"
            onClick={loadQueue}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-slate-600">
            <Loader2 size={15} className="animate-spin" /> Updating queue
            stream...
          </div>
        ) : (
          <div className="space-y-3">
            {waitingQueue.slice(0, 10).map((item) => (
              <article
                key={item._id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                      item.priority === "priority"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-teal-100 text-teal-700"
                    }`}
                  >
                    {item.displayToken.replace("AQ-", "")}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.displayToken}
                    </p>
                    <p className="text-xs text-slate-500">
                      Position #{item.position ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`chip ${item.priority === "priority" ? "chip-amber" : "chip-slate"}`}
                  >
                    {item.priority}
                  </span>
                  <span
                    className={`chip ${item.status === "serving" ? "chip-green" : "chip-blue"}`}
                  >
                    {item.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {formatWaitLabel(item.estimatedWaitMinutes)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card flex items-start gap-3 bg-gradient-to-r from-teal-50 to-slate-50 p-4 text-slate-700">
        <Sparkles size={16} className="mt-0.5 text-teal-700" />
        <p className="text-sm">
          Smart routing remains active. Priority handling is dynamically
          balanced with normal flow fairness.
        </p>
      </section>
    </div>
  );
};

export default QueueStatus;
