/**
 * Screenshots: banner sync + Sair (mobile) + selects.
 */
import { chromium, devices } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL || "http://127.0.0.1:4321";
const OUT = "/cursor/stores/self/media";

async function waitHydrated(page) {
  await page.waitForFunction(
    () => {
      const t = document.body?.innerText || "";
      return (
        !t.includes("A carregar a tua biblioteca") &&
        Boolean(window.__KETO_STORE__?.getState?.().hydrated)
      );
    },
    { timeout: 30000 },
  );
  // Espera Supabase init (banner sync ou mock)
  await page.waitForFunction(
    () => {
      const s = window.__KETO_STORE__?.getState?.();
      return s && s.supabaseReady !== null;
    },
    { timeout: 20000 },
  );
  await page.waitForTimeout(400);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  // --- Mobile: banner sync (anónimo) ---
  {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "pt-PT",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitHydrated(page);
    await page.getByRole("button", { name: /Entrar/i }).first().waitFor();
    await page.screenshot({
      path: `${OUT}/sync-banner-mobile.png`,
      fullPage: false,
    });
    await context.close();
  }

  // --- Mobile: Sair visível + menu aberto ---
  {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      locale: "pt-PT",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitHydrated(page);
    await page.evaluate(() => {
      window.__KETO_STORE__.setState({
        authUserId: "00000000-0000-4000-8000-000000000001",
        authEmail: "utilizador@keto.app",
        supabaseReady: true,
        usingMock: false,
        hydrated: true,
      });
    });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: "Sair da conta" }).waitFor();
    // Abre também o menu para mostrar «Sair da conta»
    await page.getByRole("button", { name: "Menu da conta" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/mobile-sair-menu.png`,
      fullPage: false,
    });
    await context.close();
  }

  // --- Desktop: Sair ---
  {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      locale: "pt-PT",
    });
    const page = await context.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await waitHydrated(page);
    await page.evaluate(() => {
      window.__KETO_STORE__.setState({
        authUserId: "00000000-0000-4000-8000-000000000001",
        authEmail: "utilizador@keto.app",
        supabaseReady: true,
        usingMock: false,
        hydrated: true,
      });
    });
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Menu da conta" }).click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `${OUT}/desktop-sair-menu.png`,
      fullPage: false,
    });
    await context.close();
  }

  // --- Selects após criar ---
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      locale: "pt-PT",
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/diario`, { waitUntil: "networkidle" });
    await waitHydrated(page);
    const foodName = `SyncTest ${Date.now().toString(36)}`;
    await page.evaluate(async (name) => {
      await window.__KETO_STORE__.getState().addFood({
        name,
        brand: "Local",
        category: "Teste",
        calories: 100,
        fat_g: 10,
        protein_g: 5,
        carbs_total_g: 2,
        fiber_g: 1,
        polyols_g: 0,
        sodium_mg: 0,
        potassium_mg: 0,
        magnesium_mg: 0,
        saturated_fat_g: 0,
      });
    }, foodName);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${OUT}/selects-personal-after-create.png`,
      fullPage: false,
    });
    await context.close();
  }

  await browser.close();
  console.log("OK screenshots em", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
