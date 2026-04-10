import { Bell, Menu, Search, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi, tokenApi } from "../../api/client";
import Sidebar from "./Sidebar";

const TOP_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/live-queue", label: "Live Queue" },
  { to: "/analytics", label: "Analytics" },
  { to: "/settings", label: "Settings" },
];

const AppShell = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDataset, setSearchDataset] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const refreshNotifications = async () => {
    try {
      const response = await adminApi.getEvents({ limit: 20 });
      setNotificationCount((response.events || []).length);
    } catch (error) {
      console.error(error);
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
    refreshNotifications();
  }, []);

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
              onClick={() => setIsSearchOpen(true)}
              className="rounded-full p-2 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Search"
            >
              <Search size={17} />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={async () => {
                  await refreshNotifications();
                  navigate("/analytics");
                }}
                className="rounded-full p-2 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Notifications"
              >
                <Bell size={17} />
              </button>
              {notificationCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-teal-700 px-1 text-[10px] font-semibold text-white">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              ) : null}
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-teal-200 bg-teal-50 text-teal-700">
              <UserRound size={16} />
            </span>
          </div>
        </div>
      </header>

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
