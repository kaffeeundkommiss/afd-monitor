import { test, expect } from "@playwright/test";

// partei.json ist redaktionell gepflegt und ändert sich selten: die Seite wird mit der
// echten Datei getestet, nicht mit einem Fixture.
test.beforeEach(async ({ page }) => {
  await page.route("**/fonts.googleapis.com/**", (r) => r.abort());
});

test("Parteiseite zeichnet Kennzahlen und alle Diagramme", async ({ page }) => {
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  await page.goto("/partei.html");

  await expect(page.locator("#kennzahlen")).toContainText("20,8 %");
  await expect(page.locator("#kennzahlen")).toContainText("0 von 4");
  await expect(page.locator("#chart-wahlen rect")).toHaveCount(4);
  await expect(page.locator("#chart-zeit rect")).not.toHaveCount(0);
  await expect(page.locator("#chart-vorsitz rect")).toHaveCount(7);
  await expect(page.locator("#tabelle-vorsitz tbody tr")).toHaveCount(7);
  await expect(page.locator("#vorsitz-kennzahlen")).toContainText("Kürzeste Amtszeit0,2 J.Jörg Meuthen");
  await expect(page.locator("#vorsitz-kennzahlen")).toContainText("amtierend: Tino Chrupalla / Alice Weidel");
  expect(fehler).toEqual([]);
});

test("Reihenfolge: Wahlen, Zeitleiste, Vorsitzende", async ({ page }) => {
  await page.goto("/partei.html");
  const ids = await page.locator("main .chart").evaluateAll((els) => els.map((e) => e.id));
  expect(ids).toEqual(["chart-wahlen", "chart-zeit", "chart-vorsitz"]);
});

test("Parteiseite passt auf Handybreite ohne seitliches Scrollen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  for (const seite of ["/partei.html"]) {
    await page.goto(seite);
    if (seite === "/partei.html") await expect(page.locator("main .chart svg").first()).toBeVisible();
    const breite = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(breite).toBeLessThanOrEqual(390);
  }
});

test("Navigation verbindet beide Seiten", async ({ page }) => {
  await page.route("**/api.dawum.de/**", (r) => r.abort());
  await page.goto("/index.html");
  await expect(page.locator('nav.seiten a[aria-current="page"]')).toHaveText("Umfragen");
  await page.locator("nav.seiten a", { hasText: "Partei" }).click();
  await expect(page).toHaveURL(/partei\.html$/);
  await expect(page.locator('nav.seiten a[aria-current="page"]')).toHaveText("Partei");
  await expect(page.locator("nav.seiten a")).toHaveText(["Umfragen", "Partei"]);
});

test("Zeitleiste am Handy: Farblegende und Namen der unbeschrifteten Balken", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/partei.html");
  await expect(page.locator("#legende-zeit")).toContainText("Opposition");
  // 2013 bis 2017 war die AfD nicht im Bundestag, an keiner Regierung beteiligt: keine Legende ohne Daten.
  await expect(page.locator("#legende-zeit")).toContainText("Nicht im Bundestag");
  await expect(page.locator("#legende-zeit")).not.toContainText("Regierung");
  const schl = page.locator("#schluessel-zeit");
  await expect(schl).toBeVisible();
  await expect(schl).toContainText("Meuthen");
  await expect(schl).toContainText("Chrupalla/Weidel");
});

test("Quellen der Parteiseite widersprechen sich nicht", async ({ page }) => {
  // Die Wiederwahl in Erfurt ist mit ZDF belegt; dann muss ZDF auch genannt sein.
  await page.goto("/partei.html");
  await expect(page.locator("main")).toContainText("04.07.2026: Chrupalla 70,05 %, Weidel 81,31 %, ZDF");
  await expect(page.locator("footer")).not.toContainText("partei.json");
});

test("Zeitleiste am Desktop: Schlüssel nur für Spuren, deren Balken zu schmal sind", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/partei.html");
  const schl = page.locator("#schluessel-zeit");
  await expect(schl).not.toContainText("Rolle im Bund");  // deckt die Farblegende ab
});

test("Verfassungsschutz: Rechtsstand und alle Schritte mit Quellen", async ({ page }) => {
  await page.goto("/partei.html");
  await expect(page.locator("#vs-aktuell")).toContainText("Rechtsstand 11.11.2026");
  await expect(page.locator("#vs-aktuell")).toContainText("vorläufig nicht anwenden");
  await expect(page.locator("#tabelle-vs tbody tr")).toHaveCount(5);
  await expect(page.locator("#verfassungsschutz .quelle a").first()).toHaveAttribute("href", /vg-koeln\.nrw\.de/);
});
