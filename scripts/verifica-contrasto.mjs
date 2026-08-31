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

/**
 * Accoppiamenti che non nascono dal prodotto cartesiano qui sopra.
 *
 * Le velature (`--*-soft`) e la barra ambra sono superfici su cui compare solo
 * un testo preciso, non tutta la scala: verificarle contro ogni token darebbe
 * fallimenti finti, non verificarle affatto lascerebbe scoperti proprio i
 * punti dove il colore è saturo. Il bianco sui fondi pieni è il caso dei
 * pulsanti. La barra ambra è il motivo per cui questa lista esiste: bianco su
 * quell'ambra fa 2,15:1, ed è la scelta che verrebbe istintiva.
 */
const COPPIE_ESPLICITE = [
  ["ink", "accent-soft"],
  ["accent", "accent-soft"],
  ["ink", "ok-soft"],
  ["ok", "ok-soft"],
  ["ink", "warn-soft"],
  ["warn", "warn-soft"],
  ["ink", "danger-soft"],
  ["danger", "danger-soft"],
  ["brand-ink", "brand"],
];

/** Testo bianco sui fondi pieni: pulsanti e badge. */
const SU_PIENO = ["accent", "ok", "danger"];
const BIANCO = "#ffffff";

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
const richiesti = [...TESTI, ...SFONDI, ...COPPIE_ESPLICITE.flat(), ...SU_PIENO];
const mancanti = [...new Set(richiesti)].filter((token) => !palette[token]);
if (mancanti.length > 0) {
  console.error(`Token non trovati in globals.css: ${mancanti.join(", ")}`);
  process.exit(1);
}

/** Ogni verifica da fare: [nome del testo, colore, nome dello sfondo, colore]. */
const verifiche = [];
for (const testo of TESTI) {
  for (const sfondo of SFONDI) {
    verifiche.push([`--${testo}`, palette[testo], `--${sfondo}`, palette[sfondo]]);
  }
}
for (const [testo, sfondo] of COPPIE_ESPLICITE) {
  verifiche.push([`--${testo}`, palette[testo], `--${sfondo}`, palette[sfondo]]);
}
for (const pieno of SU_PIENO) {
  verifiche.push(["bianco", BIANCO, `--${pieno}`, palette[pieno]]);
}

const fallimenti = verifiche
  .map(([testo, cTesto, sfondo, cSfondo]) => ({
    testo,
    cTesto,
    sfondo,
    cSfondo,
    rapporto: contrasto(cTesto, cSfondo),
  }))
  .filter((v) => v.rapporto < SOGLIA_AA_NORMALE);

if (fallimenti.length > 0) {
  console.error(`Contrasto insufficiente (WCAG 2.1 AA richiede ${SOGLIA_AA_NORMALE}:1 per il testo normale):\n`);
  for (const { testo, cTesto, sfondo, cSfondo, rapporto } of fallimenti) {
    console.error(`  ${testo} (${cTesto}) su ${sfondo} (${cSfondo}): ${rapporto.toFixed(2)}:1`);
  }
  process.exit(1);
}

console.log(
  `Contrasto verificato: ${verifiche.length} combinazioni, tutte sopra ${SOGLIA_AA_NORMALE}:1 (WCAG 2.1 AA).`
);
