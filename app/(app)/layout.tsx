import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { logout } from "@/app/login/actions";
import { Logo } from "@/components/Logo";
import { BottomNav, SideNav } from "@/components/Nav";
import { IconLogout } from "@/components/icons";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  const initial = user.username.trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-7 bg-navy px-4 py-6 text-slate-300 lg:flex">
        <div className="flex items-center gap-3 px-2">
          <Logo />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-white">Lab Stock</span>
            <span className="text-xs text-slate-400">วัสดุคงคลัง</span>
          </div>
        </div>
        <SideNav />
        <div className="mt-auto flex flex-col gap-1 rounded-xl bg-[#16243a] p-3.5">
          <span className="text-xs text-slate-400">เชื่อมต่อกับ Google Sheet</span>
          <span className="text-sm font-semibold text-white">Stock_record</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200/70 bg-ground/90 px-4 py-3 backdrop-blur sm:px-8">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={32} />
            <span className="font-bold">Lab Stock</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold">{user.name || user.username}</div>
              <div className="text-xs text-slate-500">{user.position}</div>
            </div>
            <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 font-bold text-primary-dark">{initial}</span>
            <form action={logout}>
              <button aria-label="ออกจากระบบ" title="ออกจากระบบ"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:text-danger">
                <IconLogout />
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 px-4 pt-6 pb-28 sm:px-8 lg:pb-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
