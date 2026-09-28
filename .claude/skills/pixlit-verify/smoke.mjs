// Smoke test del cuaderno: carga la home, dibuja, arrastra/redimensiona paneles,
// cambia la hoja, prueba modo enfoque y persistencia. Guarda capturas en OUT.
//
//   BASE_URL=http://localhost:3100 OUT=/ruta/scratchpad node smoke.mjs
//
// Requiere `playwright` instalado en el directorio desde donde se ejecuta
// (p. ej. `npm i playwright@1` en el scratchpad) y Chromium preinstalado.
import { existsSync, readdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const OUT  = process.env.OUT ?? ".";

// Chromium preinstalado en el contenedor (versión puede diferir de la de playwright)
const pwDir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
const chromeDir = existsSync(pwDir) && readdirSync(pwDir).find(d => /^chromium-\d+$/.test(d));
const executablePath = chromeDir ? `${pwDir}/${chromeDir}/chrome-linux/chrome` : undefined;

const browser = await chromium.launch({ executablePath });
const errors = [];
const fail = (msg) => { console.error("FAIL:", msg); process.exitCode = 1; };

const page = await browser.newPage({ viewport: { width: 1400, height: 850 } });
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/smoke-1-default.png` });

// La hoja cubre todo el workspace con el preset "Pantalla"
const [cw, ch] = await page.evaluate(() => { const c = document.querySelector("canvas"); return [c.clientWidth, c.getBoundingClientRect().height]; });
if (Math.abs(cw - 1400) > 2 || Math.abs(ch - (850 - 64)) > 2) fail(`hoja no cubre el workspace: ${cw}x${ch}`);

// Dibujar
await page.mouse.move(500, 400); await page.mouse.down();
for (let i = 0; i < 25; i++) await page.mouse.move(500 + i * 12, 400 + Math.sin(i / 3) * 40);
await page.mouse.up();

// Arrastrar el panel de herramientas
const hdr = page.locator('[data-panel="tools"] > div').first();
const hb = await hdr.boundingBox();
await page.mouse.move(hb.x + 8, hb.y + 8); await page.mouse.down();
await page.mouse.move(900, 300, { steps: 10 }); await page.mouse.up();

// Redimensionar "Color y grosor"
const grip = await page.locator('[data-panel="style"] > div[title^="Redimensionar"]').boundingBox();
await page.mouse.move(grip.x + 7, grip.y + 7); await page.mouse.down();
await page.mouse.move(grip.x - 200, grip.y + 60, { steps: 8 }); await page.mouse.up();

// Orientación, Extras, hoja Carta
await page.locator('[data-panel="pages"] button[title="Orientación vertical"]').dispatchEvent("click");
await page.locator('[data-panel="file"] button[title^="Extras"]').dispatchEvent("click");
await page.locator('[data-panel="sheet"] button[title="Expandir"]').dispatchEvent("click");
await page.locator('[data-panel="sheet"] select[title="Tamaño de hoja"]').selectOption({ label: "📄 Carta" });
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/smoke-2-configured.png` });

const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("pixlit-nb-workspace-v1")));
if (!prefs?.panels?.style?.w) fail("resize no persistió");
if (prefs?.panels?.pages?.orientation !== "vertical") fail("orientación no persistió");
if (!(Math.abs(prefs?.paperRatio - 11 / 8.5) < 0.01)) fail("paperRatio no persistió");

// Persistencia tras recargar + modo enfoque (Tab)
await page.reload({ waitUntil: "networkidle" }); await page.waitForTimeout(600);
const visible = await page.locator("[data-panel]").count();
if (visible !== 6) fail(`tras recargar se esperaban 6 paneles, hay ${visible}`);
await page.keyboard.press("Tab"); await page.waitForTimeout(150);
if (await page.locator("[data-panel]").count() !== 0) fail("Tab no ocultó los paneles");
await page.keyboard.press("Tab"); await page.waitForTimeout(150);

// Móvil
const m = await browser.newPage({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
await m.goto(BASE, { waitUntil: "networkidle" }); await m.waitForTimeout(800);
await m.screenshot({ path: `${OUT}/smoke-3-mobile.png` });

const relevant = errors.filter(e => !/supabase|54321|Failed to fetch|ERR_CONNECTION/i.test(e));
if (relevant.length) fail(`errores de consola: ${relevant.join(" | ")}`);
console.log(process.exitCode ? "SMOKE: FALLÓ" : "SMOKE: OK", `capturas en ${OUT}`);
await browser.close();
