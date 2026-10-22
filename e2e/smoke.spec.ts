import { test, expect } from "@playwright/test";

test("login, dashboard, add, edit, delete", async ({ page }, info) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("ชื่อผู้ใช้").fill("jo");
  await page.getByLabel("รหัสผ่าน").fill("wrong");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByText("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")).toBeVisible();

  await page.getByLabel("รหัสผ่าน").fill("1234");
  await page.getByRole("button", { name: "เข้าสู่ระบบ" }).click();
  await expect(page.getByRole("heading", { name: "ภาพรวมวัสดุคงคลัง" })).toBeVisible();
  await expect(page.getByText("วัสดุทั้งหมด")).toBeVisible();
  await page.screenshot({ path: `test-results/dashboard-${info.project.name}.png`, fullPage: true });

  await page.goto("/items");
  const name = `E2E ${info.project.name}`;
  await page.getByRole("button", { name: "เพิ่มวัสดุ" }).click();
  await page.getByLabel("ชื่อรายการ *").fill(name);
  await page.getByLabel("หน่วย *").fill("Box");
  await page.getByLabel("รับ (In)").fill("10");
  await page.getByLabel("จ่าย (Out)").fill("3");
  await page.getByLabel("ราคาต่อหน่วย (บาท)").fill("100");
  await expect(page.getByRole("dialog").getByText("700.00", { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/form-${info.project.name}.png` });
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("status").filter({ hasText: /./ })).toContainText("เพิ่มวัสดุใหม่แล้ว");

  await page.getByRole("searchbox").fill(name);
  await expect(page.getByText(name).filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: `test-results/items-${info.project.name}.png`, fullPage: true });

  await page.getByRole("button", { name: `แก้ไข ${name}` }).filter({ visible: true }).first().click();
  await page.getByLabel("จ่าย (Out)").fill("20");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByText("จำนวนจ่ายต้องไม่เกินจำนวนรับ")).toBeVisible();
  await page.getByLabel("จ่าย (Out)").fill("4");
  await page.getByRole("button", { name: "บันทึก" }).click();
  await expect(page.getByRole("status").filter({ hasText: /./ })).toContainText("บันทึกการแก้ไข");

  await page.getByRole("button", { name: `ลบ ${name}` }).filter({ visible: true }).first().click();
  await page.getByRole("button", { name: "ลบรายการ" }).click();
  await expect(page.getByRole("status").filter({ hasText: /./ })).toContainText("ลบ");
  await expect(page.getByText("ไม่พบรายการที่ตรงกับการค้นหา")).toBeVisible();
});
