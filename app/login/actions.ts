"use server";

import { redirect } from "next/navigation";
import { getGateway, SheetAccessError } from "@/lib/sheets";
import { verifyLogin } from "@/lib/auth/users";
import { createSession, destroySession } from "@/lib/auth/session";

export type LoginState = { error?: string; username?: string };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const username = String(form.get("username") ?? "");
  try {
    const user = await verifyLogin(getGateway(), username, String(form.get("password") ?? ""));
    if (!user) return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", username };
    await createSession(user);
  } catch (e) {
    return { error: e instanceof SheetAccessError ? e.message : "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่", username };
  }
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
