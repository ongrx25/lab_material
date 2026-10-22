"use server";

import { redirect } from "next/navigation";
import { getGateway, SheetAccessError } from "@/lib/sheets";
import { verifyLogin } from "@/lib/auth/users";
import { createSession, destroySession } from "@/lib/auth/session";

export type LoginState = { error?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  try {
    const user = await verifyLogin(getGateway(), String(form.get("username") ?? ""), String(form.get("password") ?? ""));
    if (!user) return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
    await createSession(user);
  } catch (e) {
    return { error: e instanceof SheetAccessError ? e.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่" };
  }
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
