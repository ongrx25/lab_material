# Lab Stock — ระบบวัสดุคงคลัง Lab

Dashboard และระบบเพิ่ม/แก้/ลบวัสดุ กลุ่มงานเทคนิคการแพทย์ โรงพยาบาลวาริชภูมิ ใช้ Google Sheet เป็นฐานข้อมูล

- ตั้งค่าและ deploy: [docs/setup.md](docs/setup.md)
- ศัพท์และโมเดลข้อมูล: [CONTEXT.md](CONTEXT.md), การตัดสินใจ: [docs/adr](docs/adr)

## พัฒนาในเครื่อง
```bash
npm install
SHEETS_FAKE=1 SESSION_SECRET=dev-secret-1234567890 npm run dev   # ใช้ข้อมูลตัวอย่าง ล็อกอิน jo / 1234
npm test          # unit tests
npm run test:e2e  # Playwright (PW_CHROMIUM=path ถ้าต้องใช้ chromium ที่ติดตั้งไว้)
```
