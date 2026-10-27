import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const errors = [];
for (const [name, vp] of [["desktop", { width: 1280, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const p = await b.newPage({ viewport: vp });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto("http://localhost:3200");
  await p.fill('input[name=username]', "jo"); await p.fill('input[name=password]', "1234");
  await p.click("text=เข้าสู่ระบบ >> nth=-1");
  await p.waitForSelector("#kpis .kpi");
  await p.screenshot({ path: `/tmp/claude-0/-home-claude-lab-material/6621d078-5a58-5a88-b54f-262677270f72/scratchpad/gas-dash-${name}.png`, fullPage: true });
  await p.click('[data-go=items] >> visible=true');
  await p.click('#items [data-new]');
  await p.fill('#itemForm [name=name]', `UI ${name}`); await p.fill('#itemForm [name=unit]', "Box");
  await p.fill('#itemForm [name=received]', "10"); await p.fill('#itemForm [name=issued]', "3"); await p.fill('#itemForm [name=unitPrice]', "100");
  await p.screenshot({ path: `/tmp/claude-0/-home-claude-lab-material/6621d078-5a58-5a88-b54f-262677270f72/scratchpad/gas-form-${name}.png` });
  await p.click('#saveBtn');
  await p.waitForSelector(`text=UI ${name} >> visible=true`);
  await p.fill('#q', `UI ${name}`);
  await p.click(`[aria-label="ลบ UI ${name}"] >> visible=true`);
  await p.click('#delBtn');
  await p.waitForSelector('#noRows:not(.hidden)');
  await p.fill('#q', '');
  await p.screenshot({ path: `/tmp/claude-0/-home-claude-lab-material/6621d078-5a58-5a88-b54f-262677270f72/scratchpad/gas-items-${name}.png`, fullPage: true });
  // receive
  await p.click('[data-go=recv] >> visible=true');
  await p.fill('#rq', 'dtx');
  await p.click('[data-rpick="LAB-02"]');
  await p.fill('#rForm [name=qty]', '20');
  await p.click('#rSave');
  await p.waitForSelector('#toast:has-text("รับเข้า DTX Strip")');
  // issue
  await p.click('[data-go=issue] >> visible=true');
  await p.fill('#iq', 'hcg');
  await p.click('[data-add="LAB-03"]'); await p.click('[data-add="LAB-03"]');
  await p.fill('#iq', 'dtx');
  await p.click('[data-add="LAB-02"]');
  await p.click('#cart [data-inc="LAB-02"]');
  await p.fill('#iq', '');
  await p.screenshot({ path: `/tmp/claude-0/-home-claude-lab-material/6621d078-5a58-5a88-b54f-262677270f72/scratchpad/gas-issue-${name}.png`, fullPage: true });
  await p.click('#issueBtn');
  await p.waitForSelector('#toast:has-text("OUT-")');
  await p.waitForSelector('#iResults .sec');
  console.log(name, "ok");
}
console.log("errors:", errors);
await b.close();
