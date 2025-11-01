export function Card({ title, sub, children }) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-200 px-5 py-4">
        <div className="text-sm font-medium text-neutral-900">{title}</div>
        {sub ? <div className="text-sm text-neutral-500">{sub}</div> : null}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="flex w-full flex-col gap-1 text-sm text-neutral-600">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs text-neutral-500">{hint}</span> : null}
    </label>
  );
}
