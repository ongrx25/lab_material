# คู่มือตั้งค่าและ deploy

ใช้เวลาประมาณ 15 นาที ทำครั้งเดียว

## 1. สร้าง Service Account (บัญชีบอทสำหรับแก้ชีต)
1. เข้า https://console.cloud.google.com แล้วสร้างโปรเจกต์ใหม่ เช่น `lab-stock`
2. ไปที่เมนู **APIs & Services → Library** ค้นหา **Google Sheets API** แล้วกด **Enable**
3. ไปที่ **IAM & Admin → Service Accounts → Create service account** ตั้งชื่อ `lab-stock-bot` แล้วกด Done (ไม่ต้องกำหนด role)
4. คลิกบัญชีที่สร้าง → แท็บ **Keys → Add key → Create new key → JSON** จะได้ไฟล์ .json ให้เก็บไว้เป็นความลับ

## 2. แชร์ชีตให้บอท
1. เปิด Google Sheet แล้วกด **แชร์**
2. ใส่อีเมลของบอท (`client_email` ในไฟล์ JSON ลงท้ายด้วย `iam.gserviceaccount.com`) และให้สิทธิ์ **ผู้แก้ไข**
3. ในหัวข้อ "การเข้าถึงทั่วไป" ตั้งเป็น **จำกัด** เพื่อไม่ให้คนนอกเห็นรหัสผ่านในแท็บ User

## 3. Deploy บน Vercel
1. สมัคร https://vercel.com ด้วยบัญชี GitHub แล้ว **Add New → Project** เลือก repo `lab_material`
2. ใน **Environment Variables** ใส่ค่า
   - `GOOGLE_SHEET_ID` = `1KkhbX34xQJ_BMxGPjCZNc3tpB8HfdcgKObrQRoa_WRM`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = ค่า `client_email` จากไฟล์ JSON
   - `GOOGLE_PRIVATE_KEY` = ค่า `private_key` จากไฟล์ JSON (คัดลอกทั้งก้อน รวม `-----BEGIN PRIVATE KEY-----`)
   - `SESSION_SECRET` = ข้อความสุ่มยาว 32 ตัวขึ้นไป
3. กด **Deploy** แล้วเปิดลิงก์ที่ได้ ล็อกอินด้วย username/password ในแท็บ User

## หมายเหตุ
- ชีต `Stock_record` ต้องมีหัวตาราง: Item code, Item discription, UOM, In, Out, Quantity, Unit Price, Amount(Baht) (Distributor, Lot, EXP., Inv# ใส่หรือไม่ก็ได้)
- เพิ่มผู้ใช้ใหม่: พิมพ์แถวใหม่ในแท็บ User ได้เลย รหัสผ่านจะถูกเข้ารหัสให้อัตโนมัติเมื่อผู้ใช้ล็อกอินครั้งแรก
- คอลัมน์ Quantity และ Amount ระบบคำนวณให้ (In − Out และ ราคา × คงเหลือ) แถวรวมท้ายชีตจะเป็นสูตร SUM
