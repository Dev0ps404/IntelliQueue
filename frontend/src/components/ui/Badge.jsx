const TONE_STYLES = {
  neutral: "border-slate-300 bg-slate-50 text-slate-700",
  normal: "border-slate-300 bg-slate-100 text-slate-700",
  priority: "border-orange-200 bg-orange-100 text-orange-800",
  waiting: "border-amber-200 bg-amber-100 text-amber-800",
  serving: "border-teal-200 bg-teal-100 text-teal-800",
  completed: "border-emerald-200 bg-emerald-100 text-emerald-800",
  skipped: "border-rose-200 bg-rose-100 text-rose-800",
};

const Badge = ({ children, tone = "neutral" }) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${
        TONE_STYLES[tone] || TONE_STYLES.neutral
      }`}
    >
      {children}
    </span>
  );
};

export default Badge;
