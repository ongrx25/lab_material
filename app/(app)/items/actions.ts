"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { getGateway } from "@/lib/sheets";
import { itemInputSchema } from "@/lib/inventory/item";
import { createItem, deleteItem, ItemNotFoundError, updateItem } from "@/lib/inventory/repository";

export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const NOT_FOUND = "รายการนี้ถูกลบหรือเปลี่ยนแปลงไปแล้ว กรุณาโหลดหน้าใหม่";

function fail(e: unknown): ActionResult {
  if (e instanceof ItemNotFoundError) return { ok: false, error: NOT_FOUND };
  console.error(e);
  return { ok: false, error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" };
}

function refresh() {
  revalidatePath("/");
  revalidatePath("/items");
}

export async function saveItem(code: string | null, form: FormData): Promise<ActionResult> {
  if (!(await getSession())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  const parsed = itemInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "กรุณาตรวจสอบข้อมูลที่กรอก", fieldErrors };
  }
  try {
    if (code) await updateItem(getGateway(), code, parsed.data);
    else await createItem(getGateway(), parsed.data);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function removeItem(code: string): Promise<ActionResult> {
  if (!(await getSession())) return { ok: false, error: "กรุณาเข้าสู่ระบบใหม่" };
  try {
    await deleteItem(getGateway(), code);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
