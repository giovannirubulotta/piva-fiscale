import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

/**
 * Alcuni ambienti (container CI, questa sandbox) hanno già un Chromium
 * installato a una versione diversa da quella che Playwright scaricherebbe.
 * Se c'è, si usa quello: scaricare centinaia di megabyte a ogni esecuzione per
 * ottenere lo stesso browser è tempo di pipeline sprecato. Altrove Playwright
 * risolve il binario da sé, come di consueto.
 */
const CHROMIUM_PREINSTALLATO = "/opt/pw-browsers/chromium";
const launchOptions = existsSync(CHROMIUM_PREINSTALLATO)
  ? { executablePath: CHROMIUM_PREINSTALLATO }
  : {};

/**
 * Test end-to-end sui percorsi critici.
 *
 * Girano contro la build di produzione, non contro `next dev`: il server di
 * sviluppo ha comportamenti propri (ricompilazione, overlay degli errori) che
 * non sono quelli che l'utente incontra, e verificare qualcosa di diverso da
 * ciò che si rilascia è verificare poco.
 *
 * Non serve un database: i percorsi coperti sono quelli che devono funzionare
 * *prima* dell'autenticazione — protezione delle rotte, redirect, resa della
 * pagina di accesso, accessibilità di base. I flussi autenticati richiedono
 * credenziali di prova su un progetto Supabase dedicato: gap dichiarato in
 * DECISIONS.md, non coperto qui.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // In CI un `test.only` dimenticato farebbe passare la pipeline eseguendo un
  // solo test: meglio farla fallire.
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,

  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },

  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions } },
    // Il mobile non è un ripensamento: metà dell'uso previsto è da telefono,
    // quindi i percorsi critici si verificano anche lì.
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions } },
  ],

  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://esempio.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "chiave-finta-per-i-test",
    },
  },
});
