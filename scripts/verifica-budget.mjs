#!/usr/bin/env node
/**
 * Performance budget applicato in CI.
 *
 * Lo standard chiede un budget definito *prima* dello sviluppo e verificato
 * dalla pipeline, non controllato a posteriori quando il sito è già lento: la
 * differenza sta tutta nel fatto che qui la build fallisce, invece di produrre
 * un avviso che nessuno legge. Il peso del JavaScript è la leva principale su
 * Interaction to Next Paint, la metrica dei Core Web Vitals su cui un'app a
 * form come questa rischia di più.
 *
 * I limiti sono deliberatamente vicini al valore attuale: un budget generoso
 * non è un budget, perché lascia passare mesi di regressioni prima di suonare.
 * Se una funzionalità li supera per una buona ragione, si alza il numero *e*
 * si annota il perché in DECISIONS.md — la soglia va discussa, non aggirata.
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHUNKS = join(RADICE, ".next/static/chunks");

/** Kilobyte non compressi. Il transfer reale è minore, ma il costo di parsing no. */
const BUDGET = {
  totaleJs: 900,
  singoloChunk: 260,
};

if (!existsSync(CHUNKS)) {
  console.error("Build non trovata: esegui `npm run build` prima di verificare il budget.");
  process.exit(1);
}

function fileJs(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((voce) => {
    const percorso = join(directory, voce.name);
    if (voce.isDirectory()) return fileJs(percorso);
    return voce.name.endsWith(".js") ? [{ percorso, kb: statSync(percorso).size / 1024 }] : [];
  });
}

const file = fileJs(CHUNKS);
const totale = file.reduce((somma, f) => somma + f.kb, 0);
const piuGrosso = file.reduce((max, f) => (f.kb > max.kb ? f : max), { kb: 0, percorso: "—" });

const violazioni = [];
if (totale > BUDGET.totaleJs) {
  violazioni.push(`JavaScript totale ${totale.toFixed(0)} KB, budget ${BUDGET.totaleJs} KB`);
}
if (piuGrosso.kb > BUDGET.singoloChunk) {
  violazioni.push(
    `chunk più grande ${piuGrosso.kb.toFixed(0)} KB (${piuGrosso.percorso.replace(RADICE + "/", "")}), budget ${BUDGET.singoloChunk} KB`
  );
}

if (violazioni.length > 0) {
  console.error("Performance budget superato:\n");
  for (const violazione of violazioni) console.error(`  ${violazione}`);
  console.error("\nAlza la soglia solo con una motivazione scritta in DECISIONS.md.");
  process.exit(1);
}

console.log(
  `Budget rispettato: ${totale.toFixed(0)}/${BUDGET.totaleJs} KB totali, chunk massimo ${piuGrosso.kb.toFixed(0)}/${BUDGET.singoloChunk} KB.`
);
