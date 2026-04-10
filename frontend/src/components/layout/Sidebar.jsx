import {
  Activity,
  BarChart3,
  LayoutDashboard,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/live-queue", label: "Live Queue", icon: Activity },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-slate-900/30 transition md:hidden ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed left-4 top-[74px] z-50 flex h-[calc(100vh-95px)] w-64 flex-col rounded-2xl border border-slate-200 bg-[#f4f7fa] p-4 shadow-xl transition-transform duration-300 md:static md:top-auto md:z-auto md:h-[calc(100vh-114px)] md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-[120%]"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Sparkles size={18} />
            </span>
            <div>
              <p className="text-base font-bold text-slate-900">Adaptive AI</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Queue Intelligence
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 p-2 text-slate-600 md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-white text-teal-700 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => {
            navigate("/dashboard?openGenerateModal=1");
            onClose();
          }}
          className="mt-auto rounded-xl bg-gradient-to-r from-teal-700 to-emerald-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-700/20"
        >
          + New Entry
        </button>

        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <p className="font-semibold uppercase tracking-[0.16em] text-slate-500">
            Live Feed
          </p>
          <p className="mt-1">
            Realtime queue updates are synced via Socket.io.
          </p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
