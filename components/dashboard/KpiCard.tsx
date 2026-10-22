export function KpiCard({ label, value, unit, hint, tone = "ink" }: {
  label: string; value: string; unit?: string; hint: string; tone?: "ink" | "warn" | "danger" | "primary";
}) {
  const color = { ink: "text-ink", warn: "text-warn", danger: "text-danger", primary: "text-primary" }[tone];
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5">
      <span className="text-[13px] font-medium text-slate-600">{label}</span>
      <span className={`text-[30px] leading-none font-bold tabular-nums ${color}`}>
        {value} {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </span>
      <span className="text-xs text-slate-500">{hint}</span>
    </div>
  );
}
