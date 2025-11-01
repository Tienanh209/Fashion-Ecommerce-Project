import { Card } from "./Card";

export default function SummaryStats({ stats = [] }) {
  return (
    <Card title="Quick Stats" sub="Snapshot of current inventory">
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3"
          >
            <div className="text-xs text-neutral-500">{stat.label}</div>
            <div className="text-lg font-semibold text-neutral-900">
              {stat.value}
            </div>
          </div>
        ))}
        {stats.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm text-neutral-500">
            No statistics yet.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
