# Lab Stock — ระบบวัสดุคงคลัง Lab

Dashboard และระบบเพิ่ม/แก้/ลบวัสดุ กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลวาริชภูมิ
รันบน **Google Apps Script** (`apps-script/Code.gs` + `apps-script/Index.html`) ใช้ Google Sheet เป็นฐานข้อมูล

- ติดตั้ง/deploy: [docs/setup.md](docs/setup.md)
- ศัพท์และโมเดลข้อมูล: [CONTEXT.md](CONTEXT.md), การตัดสินใจ: [docs/adr](docs/adr)

## ทดสอบในเครื่อง (ไม่ต้องใช้ Google)
```bash
npm install
npm test            # ทดสอบ Code.gs ด้วยตัวจำลอง Apps Script
npm run serve       # เปิด http://localhost:3200 ด้วยข้อมูลจำลอง (ล็อกอิน jo / 1234)
```
