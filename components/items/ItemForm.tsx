"use client";

import { useState, useTransition } from "react";
import type { Item } from "@/lib/inventory/item";
import { formatThaiDate, parseThaiDate } from "@/lib/inventory/thaiDate";
import { saveItem } from "@/app/(app)/items/actions";
import { thb } from "@/lib/format";
import { Modal } from "./Modal";

const toIso = (be: string) => {
  const d = parseThaiDate(be);
  return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
};
const fromIso = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return formatThaiDate(new Date(y, m - 1, d));
};

const input = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[15px] outline-none focus:border-primary focus:ring-4 focus:ring-blue-100 aria-[invalid=true]:border-danger";

function Field({ label, name, error, children, span = false }: { label: string; name: string; error?: string; children: React.ReactNode; span?: boolean }) {
  return (
    <div className={`flex flex-col gap-1.5 ${span ? "sm:col-span-2" : ""}`}>
      <label htmlFor={`f-${name}`} className="text-sm font-medium text-slate-700">{label}</label>
      {children}
      {error && <p id={`e-${name}`} className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function ItemForm({ item, units, suppliers, onClose, onSaved }: {
  item: Item | null; units: string[]; suppliers: string[]; onClose: () => void; onSaved: (msg: string) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [received, setReceived] = useState(String(item?.received ?? ""));
  const [issued, setIssued] = useState(String(item?.issued ?? ""));
  const [price, setPrice] = useState(String(item?.unitPrice ?? ""));
  const [expiryIso, setExpiryIso] = useState(toIso(item?.expiry ?? ""));

  const onHand = (Number(received) || 0) - (Number(issued) || 0);
  const value = (Number(price) || 0) * onHand;

  const submit = (form: FormData) => {
    form.set("expiry", fromIso(expiryIso));
    start(async () => {
      const res = await saveItem(item?.code ?? null, form);
      if (res.ok) onSaved(item ? `บันทึกการแก้ไข ${item.name} แล้ว` : "เพิ่มวัสดุใหม่แล้ว");
      else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  };

  const attrs = (name: string) => ({
    id: `f-${name}`, name, "aria-invalid": !!fieldErrors[name] || undefined, "aria-describedby": fieldErrors[name] ? `e-${name}` : undefined,
  });

  return (
    <Modal title={item ? `แก้ไข ${item.code}` : "เพิ่มวัสดุใหม่"} onClose={onClose} wide>
      <form action={submit} className="flex flex-col gap-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ชื่อรายการ *" name="name" error={fieldErrors.name} span>
            <input {...attrs("name")} defaultValue={item?.name} required className={input} />
          </Field>
          <Field label="บริษัท" name="supplier" error={fieldErrors.supplier}>
            <input {...attrs("supplier")} defaultValue={item?.supplier} list="dl-suppliers" className={input} />
          </Field>
          <Field label="หน่วย *" name="unit" error={fieldErrors.unit}>
            <input {...attrs("unit")} defaultValue={item?.unit} list="dl-units" required className={input} />
          </Field>
          <Field label="รับ (In)" name="received" error={fieldErrors.received}>
            <input {...attrs("received")} type="number" inputMode="numeric" min={0} step="any" value={received} onChange={(e) => setReceived(e.target.value)} className={input} />
          </Field>
          <Field label="จ่าย (Out)" name="issued" error={fieldErrors.issued}>
            <input {...attrs("issued")} type="number" inputMode="numeric" min={0} step="any" value={issued} onChange={(e) => setIssued(e.target.value)} className={input} />
          </Field>
          <Field label="ราคาต่อหน่วย (บาท)" name="unitPrice" error={fieldErrors.unitPrice}>
            <input {...attrs("unitPrice")} type="number" inputMode="decimal" min={0} step="any" value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
          </Field>
          <Field label="วันหมดอายุ" name="expiry" error={fieldErrors.expiry}>
            <input id="f-expiry" aria-invalid={!!fieldErrors.expiry || undefined} name="expiryIso" type="date" value={expiryIso} onChange={(e) => setExpiryIso(e.target.value)} className={input} />
          </Field>
          <Field label="Lot" name="lot" error={fieldErrors.lot}>
            <input {...attrs("lot")} defaultValue={item?.lot} className={`${input} font-mono`} />
          </Field>
          <Field label="เลขที่เอกสาร (Inv#)" name="invoice" error={fieldErrors.invoice}>
            <input {...attrs("invoice")} defaultValue={item?.invoice} className={input} />
          </Field>
        </div>
        <datalist id="dl-units">{units.map((u) => <option key={u} value={u} />)}</datalist>
        <datalist id="dl-suppliers">{suppliers.map((s) => <option key={s} value={s} />)}</datalist>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4" aria-live="polite">
          <div><p className="text-xs text-slate-500">คงเหลือ (คำนวณอัตโนมัติ)</p><p className={`text-xl font-bold tabular-nums ${onHand < 0 ? "text-danger" : ""}`}>{thb(onHand)}</p></div>
          <div><p className="text-xs text-slate-500">มูลค่าคงเหลือ (บาท)</p><p className="text-xl font-bold tabular-nums">{thb(value, 2)}</p></div>
        </div>

        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-medium hover:bg-slate-50">ยกเลิก</button>
          <button disabled={pending} className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60">
            {pending ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
