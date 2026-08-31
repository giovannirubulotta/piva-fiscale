import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifratura simmetrica per i segreti che l'applicazione deve poter rileggere —
 * in pratica, la password della casella di posta.
 *
 * AES-256-GCM, non AES-CBC: GCM è **autenticato**, cioè accorgersi che il
 * testo cifrato è stato manomesso fa parte della decifratura e non di un
 * controllo che qualcuno potrebbe dimenticare di scrivere. Un IV casuale per
 * ogni cifratura, mai riusato: con GCM riusare un IV sulla stessa chiave non
 * indebolisce un messaggio, li compromette entrambi.
 *
 * ## Cosa protegge, e cosa non protegge
 *
 * Protegge da chi ottiene **una copia del database**: le righe di
 * `fiscale_caselle` senza la chiave sono byte inutili, e il database è
 * condiviso con un'altra applicazione.
 *
 * **Non** protegge da chi ha accesso al progetto di deployment, perché lì
 * vivono sia la chiave sia il testo cifrato. Difendersi anche da quello
 * richiederebbe un gestore di segreti esterno con la chiave fuori dalla
 * piattaforma — sproporzionato per un'applicazione personale, ma il limite va
 * detto invece di lasciar credere che «cifrato» significhi «al sicuro da
 * tutto».
 *
 * La conseguenza pratica: nella casella va messa una **password dedicata
 * all'applicazione**, generata dal pannello del provider e revocabile da lì,
 * mai la password principale della casella.
 */

const ALGORITMO = "aes-256-gcm";
const BYTE_IV = 12; // 96 bit: la dimensione per cui GCM è specificato.
const BYTE_TAG = 16;

export class ChiaveMancante extends Error {
  constructor() {
    super(
      "CHIAVE_CIFRATURA non è configurata. Senza, le credenziali della casella non si possono né salvare né rileggere."
    );
    this.name = "ChiaveMancante";
  }
}

/**
 * La chiave, da variabile d'ambiente. 32 byte esatti in base64.
 *
 * Si legge a ogni chiamata invece di essere una costante di modulo: una
 * costante verrebbe valutata all'importazione, e un modulo importato in fase
 * di build fallirebbe la compilazione su una macchina che la variabile non ce
 * l'ha — cioè fallirebbe per il motivo sbagliato.
 */
function chiave(): Buffer {
  const grezza = process.env.CHIAVE_CIFRATURA;
  if (!grezza) throw new ChiaveMancante();

  const byte = Buffer.from(grezza, "base64");
  if (byte.length !== 32) {
    throw new Error(
      `CHIAVE_CIFRATURA deve essere di 32 byte in base64 (ne ha ${byte.length}). Generane una con: openssl rand -base64 32`
    );
  }
  return byte;
}

/** true se la cifratura è utilizzabile: si usa per spiegarlo invece di fallire. */
export function cifraturaDisponibile(): boolean {
  try {
    chiave();
    return true;
  } catch {
    return false;
  }
}

/**
 * Cifra un testo. Il risultato è `iv:tag:cifrato` in base64 — un'unica
 * stringa che sta in una colonna di testo e porta con sé tutto ciò che serve
 * a decifrarla, tranne la chiave.
 */
export function cifra(chiaro: string): string {
  const iv = randomBytes(BYTE_IV);
  const cifratore = createCipheriv(ALGORITMO, chiave(), iv);
  const cifrato = Buffer.concat([cifratore.update(chiaro, "utf8"), cifratore.final()]);
  const tag = cifratore.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), cifrato.toString("base64")].join(":");
}

export function decifra(pacchetto: string): string {
  const pezzi = pacchetto.split(":");
  if (pezzi.length !== 3) throw new Error("Testo cifrato in un formato che non riconosco.");

  const [ivB64, tagB64, cifratoB64] = pezzi;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  if (iv.length !== BYTE_IV || tag.length !== BYTE_TAG) {
    throw new Error("Testo cifrato malformato.");
  }

  const decifratore = createDecipheriv(ALGORITMO, chiave(), iv);
  decifratore.setAuthTag(tag);
  // `final()` lancia se il tag non torna: è il controllo di integrità, e non
  // va mai catturato in silenzio per «provare comunque».
  return Buffer.concat([decifratore.update(Buffer.from(cifratoB64, "base64")), decifratore.final()]).toString(
    "utf8"
  );
}

/**
 * L'ultima parte di un segreto, per farlo riconoscere senza mostrarlo.
 * Serve a rispondere a «è quella giusta?» senza rimettere in circolo la
 * password: ovunque, nell'interfaccia, si mostra questa e non l'originale.
 */
export function impronta(segreto: string): string {
  if (segreto.length <= 4) return "•".repeat(segreto.length);
  return `${"•".repeat(Math.min(segreto.length - 2, 8))}${segreto.slice(-2)}`;
}
