import { Bell, Menu, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { adminApi } from "../../api/client";
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

  const refreshNotifications = async () => {
    try {
      const response = await adminApi.getEvents({ limit: 20 });
      setNotificationCount((response.events || []).length);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, []);

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
              onClick={() => navigate("/live-queue")}
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
