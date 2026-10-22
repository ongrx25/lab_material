import { STATUS_LABEL, type Status } from "@/lib/inventory/stats";

const STYLE: Record<Status, string> = {
  ok: "bg-blue-50 text-blue-800",
  expiring: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  out: "bg-slate-100 text-slate-700",
};

export function StatusPill({ status }: { status: Status }) {
  return <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
