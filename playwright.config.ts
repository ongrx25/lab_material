import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3100", locale: "th-TH", launchOptions: { executablePath: process.env.PW_CHROMIUM } },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npx next start -p 3100",
    url: "http://localhost:3100/login",
    timeout: 240_000,
    reuseExistingServer: true,
    env: { SHEETS_FAKE: "1", SESSION_SECRET: "e2e-secret-at-least-16-chars" },
  },
});
