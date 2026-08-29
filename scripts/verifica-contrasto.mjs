#!/usr/bin/env node
/**
 * Verifica che ogni coppia testo/sfondo del design system rispetti il rapporto
 * di contrasto minimo di WCAG 2.1 livello AA (4.5:1 per il testo normale).
 *
 * Gira in CI: l'accessibilità non è un requisito opzionale, e un contrasto
 * insufficiente è un difetto misurabile, non un'opinione estetica. I colori si
 * leggono da app/globals.css invece di essere riscritti qui, così il controllo
 * non può divergere dal foglio di stile che poi va in produzione.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOGLIA_AA_NORMALE = 4.5;

/** Token usati come colore del testo. */
const TESTI = ["ink", "ink-muted", "ink-faint", "accent", "ok", "warn", "danger"];
/** Token usati come sfondo su cui quel testo può comparire. */
const SFONDI = ["bg", "surface", "surface-2"];

function leggiPalette() {
  const css = readFileSync(join(RADICE, "app/globals.css"), "utf8");
  const blocco = css.slice(css.indexOf(":root"), css.indexOf("@theme"));
  const palette = {};
  for (const [, nome, valore] of blocco.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    palette[nome] = valore;
  }
  return palette;
}

function canaleLineare(intero) {
  const c = intero / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminanza(esadecimale) {
  const h = esadecimale.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => canaleLineare(parseInt(h.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrasto(a, b) {
  const [la, lb] = [luminanza(a), luminanza(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const palette = leggiPalette();
const mancanti = [...TESTI, ...SFONDI].filter((token) => !palette[token]);
if (mancanti.length > 0) {
  console.error(`Token non trovati in globals.css: ${mancanti.join(", ")}`);
  process.exit(1);
}

const fallimenti = [];
for (const testo of TESTI) {
  for (const sfondo of SFONDI) {
    const rapporto = contrasto(palette[testo], palette[sfondo]);
    if (rapporto < SOGLIA_AA_NORMALE) {
      fallimenti.push({ testo, sfondo, rapporto });
    }
  }
}

if (fallimenti.length > 0) {
  console.error(`Contrasto insufficiente (WCAG 2.1 AA richiede ${SOGLIA_AA_NORMALE}:1 per il testo normale):\n`);
  for (const { testo, sfondo, rapporto } of fallimenti) {
    console.error(`  --${testo} (${palette[testo]}) su --${sfondo} (${palette[sfondo]}): ${rapporto.toFixed(2)}:1`);
  }
  process.exit(1);
}

console.log(
  `Contrasto verificato: ${TESTI.length * SFONDI.length} combinazioni, tutte sopra ${SOGLIA_AA_NORMALE}:1 (WCAG 2.1 AA).`
);
