import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Loader2,
  Sparkles,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { tokenApi } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { formatWaitLabel } from "../utils/format";
import { readMyToken, saveMyToken } from "../utils/localToken";

const PRIORITY_REASON_OPTIONS = ["Elderly", "Emergency", "VIP"];
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;

const UserPanel = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const socket = useSocket();

  const [selectedPriority, setSelectedPriority] = useState("normal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [summary, setSummary] = useState({
    totalInQueue: 0,
    servingToken: null,
  });
  const [config, setConfig] = useState(null);
  const [myToken, setMyToken] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    isPriority: false,
    priorityReason: "",
    priorityReasonDescription: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const averageServiceMinutes = config?.averageServiceMinutes ?? 4;

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);

    try {
      const data = await tokenApi.getQueue();
      setQueue(data.queue || []);
      setSummary(data.summary || { totalInQueue: 0, servingToken: null });
      setConfig(data.config || null);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to load queue right now.");
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const refreshMyToken = useCallback(async () => {
    const storedToken = readMyToken();
    if (!storedToken?.tokenNumber) {
      setMyToken(null);
      return;
    }

    try {
      const data = await tokenApi.getMyToken(storedToken.tokenNumber);
      setMyToken(data.token || null);
    } catch (requestError) {
      console.error(requestError);
      setMyToken(null);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    refreshMyToken();
  }, [loadQueue, refreshMyToken]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleQueueUpdate = (payload) => {
      setQueue(payload.queue || []);
      setSummary(payload.summary || { totalInQueue: 0, servingToken: null });
      setConfig(payload.config || null);
      refreshMyToken();
    };

    const handleNearTurn = (payload) => {
      setNotice(payload.message || "Your turn is coming soon.");
    };

    socket.on("queue:update", handleQueueUpdate);
    socket.on("token:near", handleNearTurn);

    const storedToken = readMyToken();
    if (storedToken?.tokenId) {
      socket.emit("join-token-room", storedToken.tokenId);
    }

    return () => {
      socket.off("queue:update", handleQueueUpdate);
      socket.off("token:near", handleNearTurn);
    };
  }, [socket, refreshMyToken]);

  const activeQueue = useMemo(
    () =>
      queue.filter(
        (item) => item.status === "waiting" || item.status === "serving",
      ),
    [queue],
  );

  const normalEstimate = useMemo(() => {
    const waitingCount = activeQueue.length;
    return Math.max(
      averageServiceMinutes,
      waitingCount * averageServiceMinutes,
    );
  }, [activeQueue, averageServiceMinutes]);

  const priorityEstimate = useMemo(() => {
    const priorityAhead = activeQueue.filter(
      (item) => item.priority === "priority",
    ).length;
    return Math.max(
      2,
      Math.round((priorityAhead + 1) * averageServiceMinutes * 0.65),
    );
  }, [activeQueue, averageServiceMinutes]);

  const validateForm = useCallback((payload) => {
    const nextErrors = {};

    if (!payload.name.trim()) {
      nextErrors.name = "Name is required.";
    }

    if (!payload.phone.trim()) {
      nextErrors.phone = "Phone number is required.";
    } else if (!PHONE_PATTERN.test(payload.phone.trim())) {
      nextErrors.phone = "Enter a valid phone number.";
    }

    if (payload.isPriority && !payload.priorityReason) {
      nextErrors.priorityReason = "Select a priority reason.";
    }

    if (!payload.priorityReasonDescription.trim()) {
      nextErrors.priorityReasonDescription = "Reason description is required.";
    }

    return nextErrors;
  }, []);

  const openGenerateForm = useCallback((priorityMode) => {
    const isPriority = priorityMode === "priority";
    setSelectedPriority(priorityMode);
    setFormErrors({});
    setFormData((current) => ({
      ...current,
      isPriority,
      priorityReason: isPriority ? current.priorityReason : "",
      priorityReasonDescription: current.priorityReasonDescription,
    }));
    setIsFormOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenModal = params.get("openGenerateModal");

    if (!shouldOpenModal) {
      return;
    }

    const requestedPriority = params.get("priority");
    const priorityMode =
      requestedPriority === "priority" ? "priority" : "normal";

    openGenerateForm(priorityMode);

    params.delete("openGenerateModal");
    params.delete("priority");

    const nextSearch = params.toString();

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, openGenerateForm]);

  const closeGenerateForm = useCallback(() => {
    if (isGenerating) {
      return;
    }

    setIsFormOpen(false);
    setFormErrors({});
  }, [isGenerating]);

  const handleGenerate = async () => {
    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      isPriority: formData.isPriority,
      priorityReason: formData.isPriority ? formData.priorityReason : null,
      priorityReasonDescription: formData.priorityReasonDescription.trim(),
      priority: formData.isPriority ? "priority" : "normal",
    };

    const nextErrors = validateForm(payload);

    if (Object.keys(nextErrors).length) {
      setFormErrors(nextErrors);
      return;
    }

    setIsGenerating(true);

    try {
      const data = await tokenApi.createToken(payload);
      setMyToken(data.token || null);
      saveMyToken(data.token);
      setNotice(`Token ${data.token?.displayToken} has been created.`);
      setError("");
      setIsFormOpen(false);
      setFormErrors({});
    } catch (requestError) {
      console.error(requestError);
      setError("Token generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitGenerate = async (event) => {
    event.preventDefault();
    await handleGenerate();
  };

  const myQueueEntry = useMemo(() => {
    if (!myToken?.tokenNumber) {
      return null;
    }

    return (
      queue.find((item) => item.tokenNumber === myToken.tokenNumber) || null
    );
  }, [queue, myToken]);

  const isNearTurn =
    myQueueEntry &&
    myQueueEntry.position != null &&
    myQueueEntry.position - 1 <= (config?.nearTurnThreshold ?? 2);

  return (
    <div className="space-y-6 fade-rise">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-teal-50 px-5 py-6">
        <p className="muted-label">Service Entry</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-900">
          Initialize New Session
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Create a normal or priority token and monitor your queue movement with
          live adaptive routing.
        </p>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,1fr]">
        <section className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Select Token Type
            </h2>
            <span className="chip chip-green">AI Recommended</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article
              className={`rounded-2xl border p-5 transition ${
                selectedPriority === "normal"
                  ? "border-slate-400 bg-slate-100"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-700">
                <Ticket size={18} />
              </span>
              <h3 className="font-display text-2xl font-semibold text-slate-900">
                Normal Token
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Standard flow with intelligent balancing for fair wait times.
              </p>
              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                Est. Wait: {formatWaitLabel(normalEstimate)}
              </div>
              <button
                type="button"
                onClick={() => {
                  openGenerateForm("normal");
                }}
                disabled={isGenerating}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {isGenerating && selectedPriority === "normal" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : null}
                Generate
                <ArrowRight size={14} />
              </button>
            </article>

            <article
              className={`rounded-2xl border p-5 transition ${
                selectedPriority === "priority"
                  ? "border-teal-300 bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
                  : "border-teal-200 bg-teal-50"
              }`}
            >
              <span
                className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${
                  selectedPriority === "priority"
                    ? "bg-white/20"
                    : "bg-white text-teal-700"
                }`}
              >
                <Zap size={18} />
              </span>
              <h3 className="font-display text-2xl font-semibold">
                Priority Token
              </h3>
              <p className="mt-2 text-sm opacity-90">
                Accelerated path for urgent sessions while fairness remains
                protected.
              </p>
              <div
                className={`mt-4 rounded-xl px-3 py-2 text-sm font-semibold ${
                  selectedPriority === "priority"
                    ? "border border-white/30 bg-white/10"
                    : "border border-teal-200 bg-white text-teal-800"
                }`}
              >
                Est. Wait: {formatWaitLabel(priorityEstimate)}
              </div>
              <button
                type="button"
                onClick={() => {
                  openGenerateForm("priority");
                }}
                disabled={isGenerating}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-60 ${
                  selectedPriority === "priority"
                    ? "bg-white text-teal-700"
                    : "bg-teal-700 text-white"
                }`}
              >
                {isGenerating && selectedPriority === "priority" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : null}
                Generate Priority
                <Sparkles size={14} />
              </button>
            </article>
          </div>
        </section>

        <section className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Current Session
            </h2>
            <span className="chip chip-blue">Live Tracking</span>
          </div>

          {myToken ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-display text-5xl font-bold text-slate-900">
                  {myToken.displayToken}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  AI-optimized position updates
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="muted-label">Status</p>
                  <p className="mt-1 font-semibold text-teal-700">
                    {myToken.status}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="muted-label">Position</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    #{myToken.position ?? "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-100 p-3">
                  <p className="muted-label">Est. Wait</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {formatWaitLabel(myToken.estimatedWaitMinutes)}
                  </p>
                </div>
              </div>

              <Link
                to="/my-token"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700"
              >
                Open Full Session View
                <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No active token yet. Generate a new entry to start dynamic queue
              tracking.
            </div>
          )}
        </section>
      </div>

      {isNearTurn || notice ? (
        <section className="surface-card flex items-start gap-3 border-teal-200 bg-gradient-to-r from-teal-700 to-emerald-500 p-4 text-white">
          <span className="mt-0.5 rounded-full bg-white/20 p-2">
            <AlertTriangle size={16} />
          </span>
          <div>
            <p className="text-sm font-semibold">Update</p>
            <p className="text-base font-semibold">
              {notice ||
                "Your turn is near. Please proceed toward the service desk."}
            </p>
          </div>
        </section>
      ) : null}

      <section className="surface-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-slate-900">
            Real-time Queue Stream
          </h2>
          <span className="chip chip-green">Live</span>
        </div>

        {queueLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 size={15} className="animate-spin" /> Syncing queue...
          </div>
        ) : (
          <div className="space-y-3">
            {activeQueue.slice(0, 6).map((item) => {
              const isMine = myToken?.tokenNumber === item.tokenNumber;

              return (
                <article
                  key={item._id}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                    isMine
                      ? "border-teal-600 bg-teal-50 shadow-[inset_3px_0_0_0_#0f766e]"
                      : "border-slate-200 bg-white"
                  }`}
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
                      <p className="text-sm font-semibold text-slate-900">
                        {isMine
                          ? `You · ${item.displayToken}`
                          : `Session ${item.displayToken}`}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Name: {item.name || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Reason:{" "}
                        {item.priorityReasonDescription ||
                          item.priorityReason ||
                          "-"}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
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
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatWaitLabel(item.estimatedWaitMinutes)} wait
                    </p>
                    <p className="text-xs text-slate-500">
                      Position #{item.position ?? "-"}
                    </p>
                  </div>
                </article>
              );
            })}

            {!activeQueue.length ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Queue is currently empty.
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex items-start gap-2">
            <Bot size={18} className="mt-0.5 text-teal-700" />
            <div>
              <p className="font-semibold text-slate-900">
                Queue Intelligence Active
              </p>
              <p>
                Adaptive fairness engine is balancing priority speed with normal
                token progression.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="surface-card w-full max-w-lg p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="muted-label">Generate Token</p>
                <h3 className="mt-1 font-display text-xl font-semibold text-slate-900">
                  Enter Customer Details
                </h3>
              </div>
              <button
                type="button"
                onClick={closeGenerateForm}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600"
                aria-label="Close form"
              >
                <X size={16} />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmitGenerate}>
              <div>
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="token-name"
                >
                  Name
                </label>
                <input
                  id="token-name"
                  type="text"
                  value={formData.name}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }));
                    setFormErrors((current) => ({ ...current, name: "" }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
                  placeholder="Enter full name"
                />
                {formErrors.name ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {formErrors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="token-phone"
                >
                  Phone Number
                </label>
                <input
                  id="token-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      phone: event.target.value,
                    }));
                    setFormErrors((current) => ({ ...current, phone: "" }));
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
                  placeholder="Enter phone number"
                />
                {formErrors.phone ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {formErrors.phone}
                  </p>
                ) : null}
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-700">Priority</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((current) => ({
                        ...current,
                        isPriority: false,
                        priorityReason: "",
                      }));
                      setSelectedPriority("normal");
                      setFormErrors((current) => ({
                        ...current,
                        priorityReason: "",
                      }));
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      formData.isPriority
                        ? "border-slate-200 bg-white text-slate-700"
                        : "border-slate-400 bg-slate-100 text-slate-900"
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((current) => ({
                        ...current,
                        isPriority: true,
                      }));
                      setSelectedPriority("priority");
                    }}
                    className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                      formData.isPriority
                        ? "border-teal-300 bg-teal-50 text-teal-800"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Yes
                  </button>
                </div>
              </div>

              {formData.isPriority ? (
                <div>
                  <label
                    className="text-sm font-semibold text-slate-700"
                    htmlFor="token-priority-reason"
                  >
                    Priority Reason
                  </label>
                  <select
                    id="token-priority-reason"
                    value={formData.priorityReason}
                    onChange={(event) => {
                      setFormData((current) => ({
                        ...current,
                        priorityReason: event.target.value,
                      }));
                      setFormErrors((current) => ({
                        ...current,
                        priorityReason: "",
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
                  >
                    <option value="">Select reason</option>
                    {PRIORITY_REASON_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  {formErrors.priorityReason ? (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {formErrors.priorityReason}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label
                  className="text-sm font-semibold text-slate-700"
                  htmlFor="token-priority-description"
                >
                  Reason Description
                </label>
                <textarea
                  id="token-priority-description"
                  rows={3}
                  maxLength={300}
                  value={formData.priorityReasonDescription}
                  onChange={(event) => {
                    setFormData((current) => ({
                      ...current,
                      priorityReasonDescription: event.target.value,
                    }));
                    setFormErrors((current) => ({
                      ...current,
                      priorityReasonDescription: "",
                    }));
                  }}
                  className="mt-1 w-full resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
                  placeholder="Briefly describe your reason"
                />
                {formErrors.priorityReasonDescription ? (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {formErrors.priorityReasonDescription}
                  </p>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeGenerateForm}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isGenerating ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : null}
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-red-600">{error}</p>
      ) : null}
      <p className="text-xs text-slate-500">
        Active queue: {summary.totalInQueue} entries | Now serving:{" "}
        {summary.servingToken?.displayToken || "-"}
      </p>
    </div>
  );
};

export default UserPanel;
