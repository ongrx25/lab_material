# รันบน Google Apps Script แทน Next.js + Vercel

ผู้ใช้ต้องการให้ระบบอยู่ใน Google ทั้งหมด จึงเปลี่ยนจาก Next.js + Service Account + Vercel เป็น Apps Script Web App (`Code.gs` + `Index.html`) ที่ deploy แบบ "ทำงานในฐานะ: ฉัน" ตัวสคริปต์จึงแก้ชีตด้วยสิทธิ์ของเจ้าของ ไม่ต้องตั้ง Service Account และชีตไม่ต้องแชร์สาธารณะ แลกกับการที่เซสชันต้องทำเอง (token เก็บใน CacheService 6 ชม.), ใช้ LockService กันการบันทึกชนกัน และรหัสผ่านใช้ SHA-256 วนซ้ำพร้อม salt แทน bcrypt (ไม่มีใน Apps Script) โค้ด Next.js เดิมยังอยู่ในประวัติ git
