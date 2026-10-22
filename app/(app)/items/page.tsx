import { loadItems } from "@/lib/inventory/load";
import { itemStatus, sortByUrgency, type Status } from "@/lib/inventory/stats";
import { bangkokToday } from "@/lib/format";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ItemTable } from "@/components/items/ItemTable";

export const dynamic = "force-dynamic";

const STATUSES = ["expired", "expiring", "out", "ok"];

export default async function ItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = bangkokToday();
  const { items, error } = await loadItems();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">รายการวัสดุ</h1>
        <p className="mt-1 text-sm text-slate-600">รายการที่ต้องสนใจ (หมดอายุ ใกล้หมดอายุ หมดสต็อก) แสดงก่อนเสมอ</p>
      </div>
      {error || !items ? (
        <ErrorPanel message={error ?? ""} />
      ) : (
        <ItemTable
          rows={sortByUrgency(items, today).map((item) => ({ item, status: itemStatus(item, today) }))}
          initialStatus={STATUSES.includes(sp.status ?? "") ? (sp.status as Status) : "all"}
          openNew={sp.new === "1"}
        />
      )}
    </div>
  );
}
