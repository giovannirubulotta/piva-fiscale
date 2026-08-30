import { test, expect } from "@playwright/test";

/**
 * Percorso critico: l'autenticazione e la protezione delle rotte.
 *
 * È il test che conta di più di tutti gli altri messi insieme. Le policy RLS
 * proteggono i dati a livello di database, ma se una rotta smettesse di
 * reindirizzare, un errore di configurazione del middleware esporrebbe la
 * struttura dell'applicazione e ogni pagina fallirebbe in modo confuso invece
 * che pulito. Qui si verifica che il perimetro tenga.
 */

/** Ogni rotta che mostra o modifica dati fiscali. L'elenco va tenuto allineato al menu. */
const ROTTE_PROTETTE = [
  "/",
  "/crm",
  "/preventivi",
  "/preventivi/nuovo",
  "/listino",
  "/fatture",
  "/fatture/nuova",
  "/clienti",
  "/clienti/nuovo",
  "/spese",
  "/documenti",
  "/scadenze",
  "/f24",
  "/quadro-lm",
  "/lavoro-dipendente",
  "/requisiti",
  "/riferimenti-normativi",
  "/impostazioni",
  "/diagnostica",
  "/privacy",
];

test.describe("perimetro di autenticazione", () => {
  for (const rotta of ROTTE_PROTETTE) {
    test(`${rotta} reindirizza al login senza sessione`, async ({ page }) => {
      await page.goto(rotta);
      await expect(page).toHaveURL(/\/login/);
    });
  }

  test("le API che espongono dati non rispondono senza sessione", async ({ request }) => {
    for (const endpoint of [
      "/api/report?anno=2026",
      "/api/fatture/00000000-0000-0000-0000-000000000000/xml",
      "/api/allegati/00000000-0000-0000-0000-000000000000",
      "/api/esportazione?anno=2026",
    ]) {
      // maxRedirects: 0 è la parte che conta. Seguendo il redirect si otterrebbe
      // 200 con l'HTML del login e il test passerebbe per il motivo sbagliato,
      // senza verificare nulla sul comportamento reale dell'endpoint.
      const risposta = await request.get(endpoint, { maxRedirects: 0 });
      expect(risposta.status(), `${endpoint} deve reindirizzare o rifiutare`).toBeGreaterThanOrEqual(300);
      expect(risposta.status(), `${endpoint} non deve rispondere con un errore server`).toBeLessThan(500);
    }
  });

  test("nessun dato fiscale raggiunge un anonimo, nemmeno seguendo i redirect", async ({ request }) => {
    const csv = await request.get("/api/report?anno=2026");
    const corpoCsv = await csv.text();
    expect(corpoCsv).not.toContain("Data emissione");
    expect(corpoCsv).not.toContain("Imponibile");

    const xml = await request.get("/api/fatture/00000000-0000-0000-0000-000000000000/xml");
    const corpoXml = await xml.text();
    expect(corpoXml).not.toContain("FatturaElettronica");
    expect(corpoXml).not.toContain("CedentePrestatore");

    // Un allegato non deve mai diventare un link firmato per un anonimo: qui si
    // verifica che la risposta non contenga un URL dello Storage.
    const allegato = await request.get("/api/allegati/00000000-0000-0000-0000-000000000000");
    expect(await allegato.text()).not.toContain("/storage/v1/object/sign/");

    // L'archivio annuale contiene tutto l'anno fiscale: se uscisse a un anonimo
    // sarebbe la fuga di dati piu' grande possibile in questa applicazione.
    const archivio = await request.get("/api/esportazione?anno=2026");
    const corpoArchivio = await archivio.text();
    expect(corpoArchivio).not.toContain("PK");
    expect(corpoArchivio).not.toContain("Archivio fiscale");
  });
});

test.describe("pagina di accesso", () => {
  test("mostra i campi necessari ed è utilizzabile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeVisible();
  });

  test("rifiuta credenziali inventate senza rompersi", async ({ page }) => {
    await page.goto("/login");
    await page.locator('input[type="email"]').fill("nessuno@esempio.invalid");
    await page.locator('input[type="password"]').fill("password-che-non-esiste");
    await page.locator('form button[type="submit"]').click();

    // Qualunque sia l'esito, non deve finire dentro l'applicazione né mostrare
    // una schermata di errore non gestita.
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("body")).not.toContainText("Application error");
  });

  test("non perde il contenuto su schermo stretto", async ({ page }) => {
    await page.goto("/login");
    // Il corpo della pagina non deve mai scorrere in orizzontale: è il difetto
    // mobile più comune e il più facile da non accorgersene su desktop.
    const scorrimentoOrizzontale = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    expect(scorrimentoOrizzontale).toBe(false);
  });
});

test.describe("accessibilità di base", () => {
  test("la pagina dichiara la lingua e ha un solo h1", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("lang", "it");
    expect(await page.locator("h1").count()).toBe(1);
  });

  test("ogni campo ha un'etichetta associata", async ({ page }) => {
    await page.goto("/login");
    const campi = page.locator("input:not([type=hidden])");
    const totale = await campi.count();
    expect(totale).toBeGreaterThan(0);

    for (let i = 0; i < totale; i++) {
      const campo = campi.nth(i);
      const etichettato = await campo.evaluate((elemento) => {
        const input = elemento as HTMLInputElement;
        if (input.getAttribute("aria-label")) return true;
        if (input.getAttribute("aria-labelledby")) return true;
        if (input.id && document.querySelector(`label[for="${input.id}"]`)) return true;
        return Boolean(input.closest("label"));
      });
      expect(etichettato, `il campo ${i + 1} deve avere un'etichetta`).toBe(true);
    }
  });

  test("il fuoco da tastiera resta visibile", async ({ page }) => {
    await page.goto("/login");
    await page.keyboard.press("Tab");
    const contorno = await page.evaluate(() => {
      const attivo = document.activeElement;
      if (!attivo || attivo === document.body) return null;
      const stile = getComputedStyle(attivo);
      return { outlineWidth: stile.outlineWidth, boxShadow: stile.boxShadow };
    });
    expect(contorno).not.toBeNull();
    const haIndicatore =
      contorno!.outlineWidth !== "0px" || (contorno!.boxShadow !== "none" && contorno!.boxShadow !== "");
    expect(haIndicatore, "il primo elemento raggiunto con Tab deve mostrare il fuoco").toBe(true);
  });
});
