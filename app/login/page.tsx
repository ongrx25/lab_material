import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-ground px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo size={52} />
          <div>
            <h1 className="text-xl font-bold">ระบบวัสดุคงคลัง Lab</h1>
            <p className="mt-1 text-sm text-slate-500">กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลวาริชภูมิ</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
