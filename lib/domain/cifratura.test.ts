import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";
import { ChiaveMancante, cifra, cifraturaDisponibile, decifra, impronta } from "./cifratura";

const CHIAVE_VALIDA = randomBytes(32).toString("base64");
let precedente: string | undefined;

beforeEach(() => {
  precedente = process.env.CHIAVE_CIFRATURA;
  process.env.CHIAVE_CIFRATURA = CHIAVE_VALIDA;
});

afterEach(() => {
  if (precedente === undefined) delete process.env.CHIAVE_CIFRATURA;
  else process.env.CHIAVE_CIFRATURA = precedente;
});

describe("cifra e decifra", () => {
  it("il giro completo restituisce il testo originale", () => {
    const segreto = "password-della-casella-2026";
    expect(decifra(cifra(segreto))).toBe(segreto);
  });

  it("regge accenti e caratteri non ASCII", () => {
    const segreto = "società-àèìòù-€-日本";
    expect(decifra(cifra(segreto))).toBe(segreto);
  });

  it("lo stesso testo cifrato due volte dà risultati diversi", () => {
    // È l'IV casuale. Senza, due caselle con la stessa password avrebbero la
    // stessa riga nel database, e si vedrebbe a occhio che coincidono.
    expect(cifra("uguale")).not.toBe(cifra("uguale"));
  });

  it("il pacchetto ha tre parti: IV, tag e testo cifrato", () => {
    expect(cifra("x").split(":")).toHaveLength(3);
  });

  it("il testo in chiaro non compare nel pacchetto", () => {
    expect(cifra("segretissimo")).not.toContain("segretissimo");
  });
});

describe("integrità", () => {
  it("un testo cifrato manomesso non si decifra: è a cosa serve GCM", () => {
    const pacchetto = cifra("password");
    const [iv, tag, cifrato] = pacchetto.split(":");
    const byte = Buffer.from(cifrato, "base64");
    byte[0] ^= 0xff;
    expect(() => decifra([iv, tag, byte.toString("base64")].join(":"))).toThrow();
  });

  it("un tag di autenticazione sostituito non passa", () => {
    const [iv, , cifrato] = cifra("password").split(":");
    const tagFinto = Buffer.alloc(16, 7).toString("base64");
    expect(() => decifra([iv, tagFinto, cifrato].join(":"))).toThrow();
  });

  it("una chiave diversa non decifra", () => {
    const pacchetto = cifra("password");
    process.env.CHIAVE_CIFRATURA = randomBytes(32).toString("base64");
    expect(() => decifra(pacchetto)).toThrow();
  });

  it("un formato inatteso viene rifiutato invece di essere interpretato", () => {
    expect(() => decifra("non-un-pacchetto")).toThrow(/formato/);
    expect(() => decifra("a:b")).toThrow(/formato/);
  });

  it("un IV di lunghezza sbagliata viene rifiutato", () => {
    const [, tag, cifrato] = cifra("password").split(":");
    const ivCorto = Buffer.alloc(4).toString("base64");
    expect(() => decifra([ivCorto, tag, cifrato].join(":"))).toThrow(/malformato/);
  });
});

describe("configurazione della chiave", () => {
  it("senza chiave lo dice, invece di cifrare con un valore vuoto", () => {
    delete process.env.CHIAVE_CIFRATURA;
    expect(() => cifra("x")).toThrow(ChiaveMancante);
    expect(cifraturaDisponibile()).toBe(false);
  });

  it("una chiave della lunghezza sbagliata spiega come generarne una buona", () => {
    process.env.CHIAVE_CIFRATURA = Buffer.alloc(16).toString("base64");
    expect(() => cifra("x")).toThrow(/openssl rand -base64 32/);
  });

  it("con una chiave valida è disponibile", () => {
    expect(cifraturaDisponibile()).toBe(true);
  });
});

describe("impronta", () => {
  it("mostra solo le ultime due lettere", () => {
    expect(impronta("password-lunga")).toBe("••••••••ga");
  });

  it("un segreto cortissimo non mostra niente", () => {
    expect(impronta("abc")).toBe("•••");
  });

  it("non lascia trapelare la lunghezza esatta di un segreto lungo", () => {
    // Otto pallini al massimo: da «••••••••xy» non si deduce se la password
    // ha dieci caratteri o quaranta.
    expect(impronta("a".repeat(40))).toBe(impronta("a".repeat(60)));
  });
});
