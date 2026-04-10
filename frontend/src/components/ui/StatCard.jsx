const TONE_CLASS = {
  slate: "from-slate-900 to-slate-700 text-white",
  teal: "from-teal-600 to-teal-500 text-white",
  amber: "from-amber-500 to-amber-400 text-slate-900",
  rose: "from-rose-500 to-rose-400 text-white",
};

const StatCard = ({ title, value, subtitle, icon: Icon, tone = "slate" }) => {
  return (
    <article
      className={`page-enter rounded-2xl bg-gradient-to-br p-4 shadow-panel md:p-5 ${
        TONE_CLASS[tone] || TONE_CLASS.slate
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold md:text-3xl">{value}</p>
          {subtitle && <p className="mt-2 text-sm opacity-90">{subtitle}</p>}
        </div>

        {Icon ? (
          <div className="rounded-xl bg-white/15 p-2">
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </article>
  );
};

export default StatCard;
