"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconBox, IconDashboard } from "./icons";

const LINKS = [
  { href: "/", label: "ภาพรวม", Icon: IconDashboard },
  { href: "/items", label: "รายการวัสดุ", Icon: IconBox },
];

export function SideNav() {
  const path = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
      {LINKS.map(({ href, label, Icon }) => {
        const active = path === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm transition ${active ? "bg-[#1e2d45] font-semibold text-white" : "text-slate-300 hover:bg-[#16243a] hover:text-white"}`}>
            <Icon /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {LINKS.map(({ href, label, Icon }) => {
        const active = path === href;
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex h-16 flex-col items-center justify-center gap-1 text-xs ${active ? "font-semibold text-primary" : "text-slate-500"}`}>
            <Icon /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
