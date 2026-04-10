import {
  Bell,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { tokenApi } from "../api/client";
import { useSocket } from "../context/SocketContext";
import { formatWaitLabel } from "../utils/format";
import { clearMyToken, readMyToken } from "../utils/localToken";

const MyToken = () => {
  const socket = useSocket();

  const [storedToken, setStoredToken] = useState(() => readMyToken());
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadToken = useCallback(async () => {
    if (!storedToken?.tokenNumber) {
      setTokenData(null);
      return;
    }

    setLoading(true);

    try {
      const response = await tokenApi.getMyToken(storedToken.tokenNumber);
      setTokenData(response.token || null);
      setError("");
    } catch (requestError) {
      console.error(requestError);
      setError("Unable to fetch your token details.");
    } finally {
      setLoading(false);
    }
  }, [storedToken]);

  useEffect(() => {
    loadToken();
  }, [loadToken]);

  useEffect(() => {
    if (!socket || !storedToken?.tokenId) {
      return;
    }

    socket.emit("join-token-room", storedToken.tokenId);

    const handleNear = (payload) => {
      setNotice(payload.message || "Your turn is near.");
    };

    const handleStatus = (payload) => {
      setNotice(payload.message || "Token status updated.");
      loadToken();
    };

    socket.on("token:near", handleNear);
    socket.on("token:status", handleStatus);
    socket.on("queue:update", loadToken);

    return () => {
      socket.off("token:near", handleNear);
      socket.off("token:status", handleStatus);
      socket.off("queue:update", loadToken);
    };
  }, [socket, storedToken, loadToken]);

  const handleClear = () => {
    clearMyToken();
    setStoredToken(null);
    setTokenData(null);
    setNotice("");
    setError("");
  };

  if (!storedToken?.tokenNumber) {
    return (
      <div className="surface-card p-8 text-center">
        <h1 className="font-display text-3xl font-bold text-slate-900">
          No Active Session
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Create a token first to unlock live session tracking.
        </p>
        <Link
          to="/dashboard"
          className="mt-4 inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Go To Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr] fade-rise">
      <section className="surface-card p-6">
        <p className="muted-label">Current Token</p>
        {loading ? (
          <div className="mt-3 flex items-center gap-2 text-slate-600">
            <Loader2 size={16} className="animate-spin" /> Syncing session...
          </div>
        ) : (
          <>
            <div className="mt-2 grid gap-5 md:grid-cols-[1.2fr,0.8fr]">
              <div>
                <p className="font-display text-[4.2rem] font-bold leading-none text-slate-900">
                  {tokenData?.displayToken || storedToken.displayToken || "-"}
                </p>
                <p className="mt-3 text-base text-slate-600">
                  Intelligence-optimized queue position
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="muted-label">Queue Depth</p>
                <p className="mt-1 font-display text-4xl font-bold text-slate-900">
                  #{tokenData?.position ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="muted-label">Status</p>
                <p className="mt-1 text-lg font-semibold text-teal-700">
                  {tokenData?.status || "-"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="muted-label">Est. Wait</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {formatWaitLabel(tokenData?.estimatedWaitMinutes)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <p className="muted-label">Priority</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {tokenData?.priority || "-"}
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="space-y-4">
        <section className="surface-card p-5">
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Check-in Location
          </h2>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={15} className="text-teal-700" /> Main Branch, Level 2
          </p>
          <p className="mt-3 text-sm text-slate-600">
            You can stay in this portal. We will notify you once you are close
            to service.
          </p>
        </section>

        {notice ? (
          <section className="surface-card border-blue-200 bg-blue-50 p-4 text-blue-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <Bell size={15} /> Update
            </div>
            <p className="text-sm">{notice}</p>
          </section>
        ) : (
          <section className="surface-card border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 size={15} /> AI Prediction
            </div>
            <p className="text-sm">
              Queue speed is currently healthy. You may be called sooner than
              expected.
            </p>
          </section>
        )}

        <button
          type="button"
          onClick={loadToken}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
        >
          <RefreshCw size={14} /> Refresh Session
        </button>

        <button
          type="button"
          onClick={handleClear}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700"
        >
          <Trash2 size={14} /> Cancel Token
        </button>

        {error ? (
          <p className="text-sm font-semibold text-red-600">{error}</p>
        ) : null}
      </aside>
    </div>
  );
};

export default MyToken;
