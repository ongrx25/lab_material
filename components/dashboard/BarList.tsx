export function BarList({ rows, empty }: { rows: { label: string; pct: number; value: string }[]; empty: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-slate-500">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,9.5rem)_minmax(0,1fr)_auto] items-center gap-3">
          <span className="truncate text-[13px] text-slate-700" title={r.label}>{r.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, Math.min(100, r.pct))}%` }} />
          </span>
          <span className="text-right text-[13px] font-semibold tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}
