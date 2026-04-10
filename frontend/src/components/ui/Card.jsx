const Card = ({ title, subtitle, actions, className = "", children }) => {
  return (
    <section className={`panel page-enter rounded-2xl p-4 md:p-5 ${className}`}>
      {(title || subtitle || actions) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>
          {actions && <div>{actions}</div>}
        </header>
      )}

      <div>{children}</div>
    </section>
  );
};

export default Card;
