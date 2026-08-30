import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { creaZip, crc32, testoInBytes } from "./zip";

/**
 * Il test che conta è l'ultimo: l'archivio viene aperto da `unzip`, cioè da un
 * programma che non sa nulla di come è stato scritto. Verificare solo le firme
 * dei blocchi significherebbe controllare che il codice faccia ciò che il
 * codice dice di fare — un test che passa anche quando il formato è sbagliato.
 *
 * Se `unzip` manca, quel test si salta invece di fallire, come già accade per
 * `xmllint` nella validazione XSD; in CI è presente.
 */
function unzipDisponibile(): boolean {
  try {
    execFileSync("unzip", ["-v"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

describe("crc32", () => {
  it("riproduce i valori di riferimento noti", () => {
    // Vettori classici, verificabili con `cksum`/zlib.
    expect(crc32(testoInBytes(""))).toBe(0);
    expect(crc32(testoInBytes("a"))).toBe(0xe8b7be43);
    expect(crc32(testoInBytes("123456789"))).toBe(0xcbf43926);
  });
});

describe("creaZip", () => {
  const voci = [
    { nome: "riepilogo.csv", contenuto: testoInBytes("data;importo\n2026-01-10;1000,00\n") },
    { nome: "xml/IT123_00001.xml", contenuto: testoInBytes("<?xml version=\"1.0\"?>\n<prova/>\n") },
    { nome: "note-perché.txt", contenuto: testoInBytes("Accento nel nome del file.\n") },
  ];

  it("comincia con la firma di un local file header e finisce con quella di chiusura", () => {
    const zip = creaZip(voci, new Date("2026-08-30T10:00:00Z"));
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Array.from(zip.slice(-22, -18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it("dichiara nella chiusura quante voci contiene", () => {
    const zip = creaZip(voci, new Date("2026-08-30T10:00:00Z"));
    const chiusura = new DataView(zip.buffer, zip.byteOffset + zip.length - 22, 22);
    expect(chiusura.getUint16(8, true)).toBe(voci.length);
    expect(chiusura.getUint16(10, true)).toBe(voci.length);
  });

  it("un archivio vuoto è valido e contiene zero voci", () => {
    const zip = creaZip([], new Date("2026-08-30T10:00:00Z"));
    expect(zip.length).toBe(22);
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it.skipIf(!unzipDisponibile())("è leggibile da unzip, con contenuti e nomi intatti", () => {
    const cartella = mkdtempSync(join(tmpdir(), "zip-"));
    try {
      const percorso = join(cartella, "prova.zip");
      writeFileSync(percorso, creaZip(voci, new Date("2026-08-30T10:00:00Z")));

      // -t verifica i CRC di ogni voce: è il controllo che smaschera un
      // archivio strutturalmente plausibile ma con dati incoerenti.
      const verifica = execFileSync("unzip", ["-t", percorso], { encoding: "utf8" });
      expect(verifica).toContain("No errors detected");

      execFileSync("unzip", ["-qq", "-O", "UTF-8", percorso, "-d", join(cartella, "estratto")]);
      expect(readFileSync(join(cartella, "estratto", "riepilogo.csv"), "utf8")).toContain("2026-01-10;1000,00");
      expect(readFileSync(join(cartella, "estratto", "xml", "IT123_00001.xml"), "utf8")).toContain("<prova/>");
      expect(readFileSync(join(cartella, "estratto", "note-perché.txt"), "utf8")).toContain("Accento");
    } finally {
      rmSync(cartella, { recursive: true, force: true });
    }
  });
});
