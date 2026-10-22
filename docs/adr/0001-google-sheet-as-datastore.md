# ใช้ Google Sheet เดิมเป็นที่เก็บข้อมูล และ Next.js เป็นหน้าเว็บ

ทีม Lab บันทึกวัสดุคงคลังอยู่ใน Google Sheet อยู่แล้ว (ชีต `stock_record` และ `user`) เราจึงให้แอป Next.js (React) อ่าน/เขียนชีตนี้โดยตรงผ่าน Google Sheets API แทนการย้ายไปฐานข้อมูลจริง เพื่อให้เจ้าหน้าที่ยังเปิดชีตดูหรือแก้เองได้ตามเดิม แลกกับการที่ชีตไม่มี transaction / validation และ API มี rate limit
