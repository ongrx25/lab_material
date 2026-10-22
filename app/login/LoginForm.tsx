"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        ชื่อผู้ใช้
        <input name="username" autoComplete="username" required autoFocus defaultValue={state.username} key={state.username}
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
        รหัสผ่าน
        <input name="password" type="password" autoComplete="current-password" required
          className="h-12 rounded-xl border border-slate-200 bg-white px-4 text-base outline-none focus:border-primary focus:ring-4 focus:ring-blue-100" />
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">{state.error}</p>
      )}
      <button disabled={pending}
        className="mt-2 h-12 rounded-xl bg-primary text-base font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60">
        {pending ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>
    </form>
  );
}
