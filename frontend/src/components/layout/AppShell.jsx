import { Bell, Menu, Search, UserRound, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi, tokenApi } from "../../api/client";
import { useSocket } from "../../context/SocketContext";
import Sidebar from "./Sidebar";

const TOP_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/live-queue", label: "Live Queue" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

const NOTIFICATION_LAST_READ_KEY = "ai_queue_notifications_last_read";

const EVENT_LABELS = {
  token_created: "Token Created",
  token_status_changed: "Token Status Updated",
  token_prioritized: "Token Prioritized",
  queue_reordered: "Queue Reordered",
  counter_assigned: "Counter Assigned",
  flow_updated: "Flow Updated",
  near_turn_notified: "Near Turn Notification",
  auth_login: "Admin Login",
};

const toEventDescription = (event) => {
  const metadata = event?.metadata || {};

  switch (event?.eventType) {
    case "token_created":
      return `${metadata.name || "User"} requested ${metadata.priority || "normal"} token.`;
    case "token_status_changed":
      return `Status changed to ${metadata.status || "updated"}.`;
    case "token_prioritized":
      return `Priority boost applied (+${metadata.boost || 0}).`;
    case "queue_reordered":
      return `Queue adjusted (${metadata.reason || "system"}).`;
    case "counter_assigned":
      return `Assigned to ${metadata.counterId || "counter"}.`;
    case "flow_updated":
      return "Queue flow configuration updated.";
    case "near_turn_notified":
      return "Near-turn alert delivered.";
    case "auth_login":
      return "Authentication activity recorded.";
    default:
      return "Queue activity updated.";
  }
};

const AppShell = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [lastReadAt, setLastReadAt] = useState(() => {
    const stored = Number(localStorage.getItem(NOTIFICATION_LAST_READ_KEY));
    return Number.isFinite(stored) ? stored : 0;
  });
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDataset, setSearchDataset] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const loadNotifications = useCallback(async (showLoader = false) => {
    if (showLoader) {
      setNotificationsLoading(true);
    }

    try {
      const response = await adminApi.getEvents({ limit: 30 });
      setNotifications(response.events || []);
      setNotificationsError("");
    } catch (error) {
      console.error(error);
      setNotificationsError("Unable to load notifications.");
    } finally {
      if (showLoader) {
        setNotificationsLoading(false);
      }
    }
  }, []);

  const markNotificationsRead = useCallback(() => {
    const now = Date.now();
    setLastReadAt(now);
    localStorage.setItem(NOTIFICATION_LAST_READ_KEY, String(now));
  }, []);

  const unreadNotificationCount = useMemo(
    () =>
      notifications.filter(
        (item) => new Date(item.createdAt).getTime() > lastReadAt,
      ).length,
    [notifications, lastReadAt],
  );

  const handleNotificationToggle = async () => {
    const nextOpen = !isNotificationOpen;
    setIsNotificationOpen(nextOpen);

    if (nextOpen) {
      setIsSearchOpen(false);
      await loadNotifications(true);
      markNotificationsRead();
    }
  };

  const loadSearchDataset = async () => {
    setSearchLoading(true);

    try {
      const response = await tokenApi.getQueue();
      setSearchDataset(response.queue || []);
      setSearchError("");
    } catch (error) {
      console.error(error);
      setSearchError("Unable to load search data.");
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const handleActivity = () => {
      loadNotifications(false);
    };

    socket.on("queue:update", handleActivity);
    socket.on("queue:reordered", handleActivity);
    socket.on("token:created", handleActivity);
    socket.on("token:status-changed", handleActivity);

    return () => {
      socket.off("queue:update", handleActivity);
      socket.off("queue:reordered", handleActivity);
      socket.off("token:created", handleActivity);
      socket.off("token:status-changed", handleActivity);
    };
  }, [socket, loadNotifications]);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    loadSearchDataset();
  }, [isSearchOpen]);

  const filteredSearchResults = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    const filtered = searchDataset.filter((item) => {
      const token = String(item.displayToken || "").toLowerCase();
      const name = String(item.name || "").toLowerCase();
      const reason = String(
        item.priorityReasonDescription || item.priorityReason || "",
      ).toLowerCase();
      const status = String(item.status || "").toLowerCase();

      if (!keyword) {
        return true;
      }

      return (
        token.includes(keyword) ||
        name.includes(keyword) ||
        reason.includes(keyword) ||
        status.includes(keyword)
      );
    });

    return filtered.slice(0, 12);
  }, [searchDataset, searchTerm]);

  return (
    <div className="min-h-screen bg-[#eff3f7] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[1500px] items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 md:hidden"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>

            <NavLink
              to="/dashboard"
              className="font-display text-xl font-bold text-teal-700"
            >
              KineticStream
            </NavLink>
          </div>

          <nav className="hidden items-center gap-8 md:flex">
            {TOP_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `border-b-2 pb-1 text-sm font-semibold transition ${
                    isActive
                      ? "border-teal-500 text-teal-700"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-slate-500">
            <button
              type="button"
              onClick={() => {
                setIsNotificationOpen(false);
                setIsSearchOpen(true);
              }}
              className="rounded-full p-2 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Search"
            >
              <Search size={17} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={handleNotificationToggle}
                className="rounded-full p-2 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Notifications"
              >
                <Bell size={17} />
              </button>
              {unreadNotificationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-semibold text-white">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              ) : null}
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700">
              <UserRound size={16} />
            </span>
          </div>
        </div>
      </header>

      {isNotificationOpen ? (
        <>
          <button
            type="button"
            onClick={() => setIsNotificationOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/20"
            aria-label="Close notifications"
          />

          <div className="fixed right-4 top-20 z-50 w-[min(460px,calc(100%-1.5rem))] rounded-2xl border border-slate-200 bg-white shadow-2xl md:right-8">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Notifications
                </p>
                <p className="text-xs text-slate-500">Latest queue activity</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await loadNotifications(true);
                    markNotificationsRead();
                  }}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={() => setIsNotificationOpen(false)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500"
                  aria-label="Close notifications panel"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {notificationsLoading ? (
                <p className="rounded-xl px-3 py-4 text-sm text-slate-500">
                  Loading notifications...
                </p>
              ) : notificationsError ? (
                <p className="rounded-xl px-3 py-4 text-sm font-semibold text-red-600">
                  {notificationsError}
                </p>
              ) : notifications.length ? (
                notifications.map((event) => (
                  <button
                    key={event._id}
                    type="button"
                    onClick={() => {
                      setIsNotificationOpen(false);
                      navigate(
                        event.eventType === "flow_updated"
                          ? "/settings"
                          : "/live-queue",
                      );
                    }}
                    className="mb-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {EVENT_LABELS[event.eventType] || "Queue Activity"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {toEventDescription(event)}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        {new Date(event.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <p className="rounded-xl px-3 py-4 text-sm text-slate-500">
                  No notifications yet.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      {isSearchOpen ? (
        <>
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(false);
              setSearchTerm("");
            }}
            className="fixed inset-0 z-40 bg-slate-900/20"
            aria-label="Close search"
          />

          <div className="fixed left-1/2 top-20 z-50 w-[min(760px,calc(100%-1.5rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Search size={16} className="text-slate-500" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search token, name, reason, status..."
                className="w-full bg-transparent text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchTerm("");
                }}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-500"
                aria-label="Close search panel"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-[380px] overflow-y-auto p-2">
              {searchLoading ? (
                <p className="rounded-xl px-3 py-4 text-sm text-slate-500">
                  Loading search results...
                </p>
              ) : searchError ? (
                <p className="rounded-xl px-3 py-4 text-sm font-semibold text-red-600">
                  {searchError}
                </p>
              ) : filteredSearchResults.length ? (
                filteredSearchResults.map((item) => (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchTerm("");
                      navigate("/queue-status");
                    }}
                    className="mb-1 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left hover:bg-white"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.displayToken} · {item.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.priorityReasonDescription ||
                          item.priorityReason ||
                          "No reason provided"}
                      </p>
                    </div>
                    <span className="chip chip-blue">{item.status}</span>
                  </button>
                ))
              ) : (
                <p className="rounded-xl px-3 py-4 text-sm text-slate-500">
                  No matching results found.
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="mx-auto flex w-full max-w-[1500px] gap-5 px-4 py-6 md:px-8">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        <main className="w-full flex-1 overflow-hidden rounded-3xl border border-slate-200 bg-white/70 px-4 py-5 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.5)] md:px-8 md:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppShell;
