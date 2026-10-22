import Link from "next/link";
import { loadItems } from "@/lib/inventory/load";
import { dashboardStats } from "@/lib/inventory/stats";
import { bangkokToday, thaiLongDate, thb } from "@/lib/format";
import { ErrorPanel } from "@/components/ErrorPanel";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Card } from "@/components/dashboard/Card";
import { StatusDonut } from "@/components/dashboard/StatusDonut";
import { BarList } from "@/components/dashboard/BarList";
import { IconPlus } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = bangkokToday();
  const { items, error } = await loadItems();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">ภาพรวมวัสดุคงคลัง</h1>
          <p className="mt-1 text-sm text-slate-600">ข้อมูล ณ วันที่ {thaiLongDate(today)} · กลุ่มงานเทคนิคการแพทย์</p>
        </div>
        <Link href="/items?new=1" className="flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-dark">
          <IconPlus /> เพิ่มวัสดุ
        </Link>
      </div>

      {error || !items ? <ErrorPanel message={error ?? ""} /> : <Dashboard items={items} today={today} />}
    </div>
  );
}

function Dashboard({ items, today }: { items: NonNullable<Awaited<ReturnType<typeof loadItems>>["items"]>; today: Date }) {
  const s = dashboardStats(items, today);
  const suppliers = new Set(items.map((i) => i.supplier).filter(Boolean)).size;
  const maxSupplier = s.valueBySupplier[0]?.value ?? 1;
  const first = s.nextExpiring[0];

  return (
    <>
      <section aria-label="ตัวชี้วัดหลัก" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <KpiCard label="วัสดุทั้งหมด" value={thb(s.total)} unit="รายการ" hint={`จาก ${suppliers} บริษัท`} />
        <KpiCard label="มูลค่าคงคลัง" value={`฿${thb(s.stockValue)}`} hint="รวมมูลค่าคงเหลือทุกรายการ" />
        <KpiCard label="หมดสต็อก" value={thb(s.outOfStock)} unit="รายการ" hint="คงเหลือ 0 ควรสั่งซื้อ" tone="danger" />
        <KpiCard label="ใกล้หมดอายุ" value={thb(s.expiring)} unit="รายการ" hint="ภายใน 6 เดือน" tone="warn" />
        <KpiCard label="หมดอายุแล้ว" value={thb(s.expired)} unit="รายการ"
          hint={first ? `ถัดไป ${first.name} · อีก ${first.daysLeft} วัน` : "ไม่มีรายการใกล้หมดอายุ"} tone="danger" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="สถานะสต็อก">
          <StatusDonut byStatus={s.byStatus} />
        </Card>
        <Card title="มูลค่าคงคลังตามบริษัท" aside={<span className="text-xs text-slate-500">บาท</span>}>
          <BarList empty="ยังไม่มีมูลค่าคงคลัง"
            rows={s.valueBySupplier.map((v) => ({ label: v.supplier, pct: (v.value / maxSupplier) * 100, value: thb(v.value) }))} />
        </Card>
        <Card title="อัตราการใช้สูงสุด" aside={<span className="text-xs text-slate-500">จ่าย ÷ รับ</span>}>
          <BarList empty="ยังไม่มีข้อมูลการจ่าย" rows={s.topUsage.map((u) => ({ label: u.name, pct: u.pct, value: `${u.pct}%` }))} />
        </Card>
      </div>

      <Card title="ใกล้หมดอายุ" aside={<Link href="/items?status=expiring" className="text-sm font-medium text-primary hover:underline">ดูทั้งหมด</Link>}>
        {s.nextExpiring.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">ไม่มีวัสดุที่ระบุวันหมดอายุ</p>
        ) : (
          <ul className="grid gap-x-8 sm:grid-cols-2">
            {s.nextExpiring.map((e) => {
              const urgent = e.daysLeft <= 183;
              return (
                <li key={e.code} className="flex items-center gap-3 border-b border-slate-100 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <p className="text-xs text-slate-500">{e.code} · หมดอายุ {e.expiry}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${urgent ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
                    อีก {thb(e.daysLeft)} วัน
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
