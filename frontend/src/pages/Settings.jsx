import { BellRing, Clock3, Loader2, Save, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api/client";

const DEFAULT_FLOW = {
  averageServiceMinutes: 4,
  maxPriorityStreak: 2,
  nearTurnThreshold: 2,
  autoServeNext: true,
};

const Settings = () => {
  const [flow, setFlow] = useState(DEFAULT_FLOW);
  const [initialFlow, setInitialFlow] = useState(DEFAULT_FLOW);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [weekdayStart, setWeekdayStart] = useState("09:00");
  const [weekdayEnd, setWeekdayEnd] = useState("18:00");
  const [weekendStart, setWeekendStart] = useState("10:00");
  const [weekendEnd, setWeekendEnd] = useState("14:00");

  const loadFlow = async () => {
    setLoading(true);

    try {
      const response = await adminApi.getFlow();
      const config = response.config || DEFAULT_FLOW;
      setFlow(config);
      setInitialFlow(config);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlow();
  }, []);

  const hasChanges = useMemo(() => {
    return (
      Number(flow.averageServiceMinutes) !==
        Number(initialFlow.averageServiceMinutes) ||
      Number(flow.maxPriorityStreak) !==
        Number(initialFlow.maxPriorityStreak) ||
      Number(flow.nearTurnThreshold) !==
        Number(initialFlow.nearTurnThreshold) ||
      Boolean(flow.autoServeNext) !== Boolean(initialFlow.autoServeNext)
    );
  }, [flow, initialFlow]);

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload = {
        averageServiceMinutes: Number(flow.averageServiceMinutes),
        maxPriorityStreak: Number(flow.maxPriorityStreak),
        nearTurnThreshold: Number(flow.nearTurnThreshold),
        autoServeNext: Boolean(flow.autoServeNext),
      };

      const response = await adminApi.updateFlow(payload);
      const nextConfig = response.config || payload;
      setFlow(nextConfig);
      setInitialFlow(nextConfig);
      setNotice("Configuration saved successfully.");
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setFlow(initialFlow);
    setNotice("Changes discarded.");
    setError("");
  };

  return (
    <div className="space-y-6 fade-rise">
      <section>
        <h1 className="font-display text-4xl font-bold text-slate-900">
          Admin Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Configure queue intelligence, fairness, and operational parameters.
        </p>
      </section>

      {loading ? (
        <div className="surface-card p-8 text-slate-600">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Loading settings...
          </span>
        </div>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <article className="surface-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Clock3 size={16} className="text-teal-700" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Core Performance
                </h2>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <label className="block">
                  <span className="muted-label">
                    Average Service Time (mins)
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={flow.averageServiceMinutes}
                    onChange={(event) =>
                      setFlow((previous) => ({
                        ...previous,
                        averageServiceMinutes: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  />
                </label>

                <label className="block">
                  <span className="muted-label">Priority Weighting Factor</span>
                  <input
                    type="range"
                    min="1"
                    max="6"
                    value={flow.maxPriorityStreak}
                    onChange={(event) =>
                      setFlow((previous) => ({
                        ...previous,
                        maxPriorityStreak: event.target.value,
                      }))
                    }
                    className="mt-2 w-full accent-teal-700"
                  />
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>Fairness</span>
                    <span>Priority</span>
                  </div>
                </label>
              </div>
            </article>

            <article className="surface-card p-5">
              <div className="mb-4 flex items-center gap-2">
                <Zap size={16} className="text-blue-700" />
                <h2 className="font-display text-xl font-semibold text-slate-900">
                  Intelligent Automation
                </h2>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <div>
                    <p className="font-semibold">Auto-serve next token</p>
                    <p className="text-xs text-slate-500">
                      Automatically starts the next eligible token.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(flow.autoServeNext)}
                    onChange={(event) =>
                      setFlow((previous) => ({
                        ...previous,
                        autoServeNext: event.target.checked,
                      }))
                    }
                    className="h-5 w-5 accent-teal-700"
                  />
                </label>

                <label className="block">
                  <span className="muted-label">
                    Near-turn notification threshold
                  </span>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={flow.nearTurnThreshold}
                    onChange={(event) =>
                      setFlow((previous) => ({
                        ...previous,
                        nearTurnThreshold: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                  />
                </label>
              </div>
            </article>
          </section>

          <section className="surface-card p-5">
            <div className="mb-4 flex items-center gap-2">
              <BellRing size={16} className="text-slate-700" />
              <h2 className="font-display text-xl font-semibold text-slate-900">
                Working Hours
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="muted-label">Weekdays</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={weekdayStart}
                    onChange={(event) => setWeekdayStart(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    value={weekdayEnd}
                    onChange={(event) => setWeekdayEnd(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="muted-label">Weekends</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="time"
                    value={weekendStart}
                    onChange={(event) => setWeekendStart(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2"
                  />
                  <span className="text-slate-500">to</span>
                  <input
                    type="time"
                    value={weekendEnd}
                    onChange={(event) => setWeekendEnd(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={!hasChanges}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
            >
              Discard Changes
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {saving ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              Save Configurations
            </button>
          </section>
        </>
      )}

      {notice ? (
        <p className="text-sm font-semibold text-teal-700">{notice}</p>
      ) : null}
      {error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
};

export default Settings;
