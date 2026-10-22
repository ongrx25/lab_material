import type { Status } from "@/lib/inventory/stats";
import { STATUS_LABEL } from "@/lib/inventory/stats";

export const STATUS_COLOR: Record<Status, string> = {
  ok: "#1d4ed8",
  expiring: "#f59e0b",
  expired: "#b91c1c",
  out: "#cbd5e1",
};

const ORDER: Status[] = ["ok", "expiring", "expired", "out"];

export function StatusDonut({ byStatus }: { byStatus: Record<Status, number> }) {
  const total = ORDER.reduce((a, s) => a + byStatus[s], 0) || 1;
  let acc = 0;
  const stops = ORDER.map((s) => {
    const from = (acc / total) * 100;
    acc += byStatus[s];
    return `${STATUS_COLOR[s]} ${from}% ${(acc / total) * 100}%`;
  }).join(", ");
  const inStock = total - byStatus.out;
  const label = ORDER.map((s) => `${STATUS_LABEL[s]} ${byStatus[s]}`).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-7">
      <div role="img" aria-label={label} className="flex h-40 w-40 shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${stops})` }}>
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full bg-white">
          <span className="text-2xl leading-none font-bold">{inStock}</span>
          <span className="mt-1 text-xs text-slate-500">มีของในคลัง</span>
        </div>
      </div>
      <ul className="flex min-w-40 flex-1 flex-col gap-3">
        {ORDER.map((s) => (
          <li key={s} className="flex items-center gap-2.5 text-sm">
            <span className="h-3 w-3 rounded-[3px]" style={{ background: STATUS_COLOR[s] }} />
            <span className="flex-1">{STATUS_LABEL[s]}</span>
            <strong className="tabular-nums">{byStatus[s]}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
