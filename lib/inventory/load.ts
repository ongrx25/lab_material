import "server-only";
import { getGateway } from "@/lib/sheets";
import { listItems } from "./repository";
import type { Item } from "./item";

/** Loads items for a page, turning failures into a user-facing Thai message. */
export async function loadItems(): Promise<{ items: Item[]; error?: undefined } | { items?: undefined; error: string }> {
  try {
    return { items: await listItems(getGateway()) };
  } catch (e) {
    console.error(e);
    return { error: e instanceof Error ? e.message : "ไม่ทราบสาเหตุ" };
  }
}

