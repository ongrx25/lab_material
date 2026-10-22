import { IconAlert } from "./icons";

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-danger">
      <IconAlert className="mt-0.5 shrink-0" />
      <div>
        <p className="font-semibold">โหลดข้อมูลจาก Google Sheet ไม่สำเร็จ</p>
        <p className="mt-1 text-sm text-red-800">{message}</p>
      </div>
    </div>
  );
}
