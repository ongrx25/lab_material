"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/inventory/item";
import { STATUS_LABEL, type Status } from "@/lib/inventory/stats";
import { removeItem } from "@/app/(app)/items/actions";
import { thb } from "@/lib/format";
import { IconEdit, IconPlus, IconSearch, IconTrash } from "@/components/icons";
import { ItemForm } from "./ItemForm";
import { Modal } from "./Modal";
import { StatusPill } from "./StatusPill";

type Row = { item: Item; status: Status };
type Filter = Status | "all";
const FILTERS: Filter[] = ["all", "expired", "expiring", "out", "ok"];

export function ItemTable({ rows, initialStatus, openNew }: { rows: Row[]; initialStatus: Filter; openNew: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const [filter, setFilter] = useState<Filter>(initialStatus);
  const [editing, setEditing] = useState<Item | null | "new">(openNew ? "new" : null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const [toast, setToast] = useState<string>();

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, expired: 0, expiring: 0, out: 0, ok: 0 };
    rows.forEach((r) => c[r.status]++);
    return c;
  }, [rows]);

  const shown = useMemo(
    () => rows.filter((r) =>
      (filter === "all" || r.status === filter) &&
      (!q || r.item.name.toLowerCase().includes(q) || r.item.code.toLowerCase().includes(q) ||
        r.item.supplier.toLowerCase().includes(q) || r.item.lot.toLowerCase().includes(q))),
    [rows, filter, q],
  );

  const units = useMemo(() => [...new Set(rows.map((r) => r.item.unit).filter(Boolean))].sort(), [rows]);
  const suppliers = useMemo(() => [...new Set(rows.map((r) => r.item.supplier).filter(Boolean))].sort(), [rows]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(undefined), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const closeForm = useCallback(() => {
    setEditing(null);
    if (openNew) router.replace("/items");
  }, [openNew, router]);

  const saved = (msg: string) => {
    closeForm();
    setToast(msg);
    router.refresh();
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-blue-100">
          <IconSearch className="text-slate-500" />
          <span className="sr-only">ค้นหาวัสดุ</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="พิมพ์ชื่อ รหัส บริษัท หรือ Lot บางส่วน"
            className="h-full flex-1 bg-transparent text-[15px] outline-none" />
        </label>
        <button onClick={() => setEditing("new")} className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark">
          <IconPlus /> เพิ่มวัสดุ
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex gap-2 overflow-x-auto p-4" role="group" aria-label="กรองตามสถานะ">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
              className={`h-9 shrink-0 rounded-full border px-3.5 text-[13px] ${filter === f ? "border-ink bg-ink text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              {f === "all" ? "ทั้งหมด" : STATUS_LABEL[f]} <span className="opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="border-t border-slate-100 px-5 py-12 text-center text-sm text-slate-500">ไม่พบรายการที่ตรงกับการค้นหา</p>
        ) : (
          <>
            {/* desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[920px] border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-600">
                    <th className="px-5 py-3 font-semibold">รายการ</th>
                    <th className="px-3 py-3 font-semibold">หน่วย</th>
                    <th className="px-3 py-3 text-right font-semibold">รับ</th>
                    <th className="px-3 py-3 text-right font-semibold">จ่าย</th>
                    <th className="px-3 py-3 text-right font-semibold">คงเหลือ</th>
                    <th className="px-3 py-3 text-right font-semibold">มูลค่า (฿)</th>
                    <th className="px-3 py-3 font-semibold">Lot</th>
                    <th className="px-3 py-3 font-semibold">วันหมดอายุ</th>
                    <th className="px-3 py-3 font-semibold">สถานะ</th>
                    <th className="px-5 py-3 text-right font-semibold">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map(({ item, status }) => (
                    <tr key={item.code} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-3">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-slate-500">{item.code}{item.supplier && ` · ${item.supplier}`}</div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">{item.unit}</td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{thb(item.received)}</td>
                      <td className="px-3 py-3 text-right text-slate-600 tabular-nums">{thb(item.issued)}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">{thb(item.onHand)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{thb(item.value, 2)}</td>
                      <td className="px-3 py-3 font-mono text-[13px] text-slate-600">{item.lot || "—"}</td>
                      <td className="px-3 py-3 text-slate-700">{item.expiry || "—"}</td>
                      <td className="px-3 py-3"><StatusPill status={status} /></td>
                      <td className="px-5 py-2 text-right whitespace-nowrap">
                        <RowActions item={item} onEdit={setEditing} onDelete={setDeleting} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* mobile cards */}
            <ul className="flex flex-col md:hidden">
              {shown.map(({ item, status }) => (
                <li key={item.code} className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.code}{item.supplier && ` · ${item.supplier}`}</p>
                    </div>
                    <StatusPill status={status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Metric label="คงเหลือ" value={`${thb(item.onHand)} ${item.unit}`} strong />
                    <Metric label="มูลค่า" value={`฿${thb(item.value)}`} />
                    <Metric label="หมดอายุ" value={item.expiry || "—"} />
                  </div>
                  <div className="flex justify-end"><RowActions item={item} onEdit={setEditing} onDelete={setDeleting} /></div>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">แสดง {shown.length} จาก {rows.length} รายการ</p>
      </section>

      {editing && (
        <ItemForm item={editing === "new" ? null : editing} units={units} suppliers={suppliers} onClose={closeForm} onSaved={saved} />
      )}
      {deleting && (
        <DeleteDialog item={deleting} onClose={() => setDeleting(null)}
          onDeleted={() => { setDeleting(null); setToast(`ลบ ${deleting.name} แล้ว`); router.refresh(); }} />
      )}
      {toast && (
        <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-ink px-4 py-3 text-sm text-white shadow-lg lg:bottom-6">{toast}</div>
      )}
    </>
  );
}

function Metric({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className={`text-sm tabular-nums ${strong ? "font-bold" : ""}`}>{value}</p>
    </div>
  );
}

function RowActions({ item, onEdit, onDelete }: { item: Item; onEdit: (i: Item) => void; onDelete: (i: Item) => void }) {
  return (
    <span className="inline-flex gap-2">
      <button onClick={() => onEdit(item)} aria-label={`แก้ไข ${item.name}`}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary">
        <IconEdit />
      </button>
      <button onClick={() => onDelete(item)} aria-label={`ลบ ${item.name}`}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-white text-danger hover:bg-red-50">
        <IconTrash />
      </button>
    </span>
  );
}

function DeleteDialog({ item, onClose, onDeleted }: { item: Item; onClose: () => void; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const confirm = () =>
    start(async () => {
      const res = await removeItem(item.code);
      if (res.ok) onDeleted();
      else setError(res.error);
    });
  return (
    <Modal title="ยืนยันการลบ" onClose={onClose}>
      <div className="flex flex-col gap-4 p-5">
        <p className="text-[15px]">ลบ <strong>{item.name}</strong> ({item.code}) ออกจากชีต Stock_record ใช่ไหม? การลบนี้ย้อนกลับไม่ได้</p>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
          <button onClick={confirm} disabled={pending} className="h-11 rounded-xl bg-danger px-5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60">
            {pending ? "กำลังลบ…" : "ลบรายการ"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
