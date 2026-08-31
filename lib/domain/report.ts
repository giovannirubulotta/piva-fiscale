import { round2 } from "./calcolo";
import { imponibileFiscale } from "./fattura";
import type { Fattura } from "./types";

/**
 * Le aggregazioni che rispondono a "come sta andando".
 *
 * Sta qui e non nella pagina perché gli stessi tre numeri — emesso, incassato,
 * da incassare — servono al cruscotto e al report, e due implementazioni della
 * stessa somma prima o poi danno due risultati diversi sulla stessa schermata.
 *
 * La distinzione che regge tutto: **emesso** è quello che hai fatturato,
 * **incassato** è quello che hai preso. In regime forfettario le tasse si
 * pagano per cassa, quindi solo il secondo conta per il fisco; il primo dice
 * quanto hai lavorato. Un cruscotto che mostra solo uno dei due mente in una
 * delle due direzioni.
 */

export interface Periodo {
  da: string;
  a: string;
  etichetta: string;
}

/** I periodi che si scelgono davvero, calcolati rispetto a una data data. */
export function periodiPredefiniti(oggi: string): Periodo[] {
  const anno = Number(oggi.slice(0, 4));
  const mese = Number(oggi.slice(5, 7));
  const trimestre = Math.floor((mese - 1) / 3);
  const primoMeseTrimestre = trimestre * 3 + 1;

  return [
    { da: `${oggi.slice(0, 7)}-01`, a: ultimoGiornoDelMese(anno, mese), etichetta: "Mese corrente" },
    {
      da: `${anno}-${String(primoMeseTrimestre).padStart(2, "0")}-01`,
      a: ultimoGiornoDelMese(anno, primoMeseTrimestre + 2),
      etichetta: "Trimestre",
    },
    { da: `${anno}-01-01`, a: `${anno}-12-31`, etichetta: `Anno ${anno}` },
    { da: `${anno - 1}-01-01`, a: `${anno - 1}-12-31`, etichetta: `Anno ${anno - 1}` },
  ];
}

function ultimoGiornoDelMese(anno: number, mese: number): string {
  const data = new Date(Date.UTC(anno, mese, 0));
  return data.toISOString().slice(0, 10);
}

export interface RiepilogoOperativo {
  /** Fatturato del periodo per data di emissione, note di credito già sottratte. */
  emesso: number;
  /** Fatturato realmente incassato nel periodo, per data di incasso. */
  incassato: number;
  /** Emesso e non ancora incassato, alla fine del periodo. */
  daIncassare: number;
  numeroFatture: number;
  fatturaMedia: number;
  numeroNoteCredito: number;
}

/** Le fatture che concorrono ai conti: le annullate non sono mai esistite. */
function attive(fatture: Fattura[]): Fattura[] {
  return fatture.filter((f) => f.stato !== "annullata");
}

/** Importo con segno: una nota di credito storna, quindi entra negativa. */
function importoConSegno(fattura: Fattura): number {
  return (fattura.tipoDocumento === "TD04" ? -1 : 1) * imponibileFiscale(fattura);
}

export function riepilogoOperativo(fatture: Fattura[], periodo: Periodo): RiepilogoOperativo {
  const nelPeriodo = attive(fatture).filter(
    (f) => f.dataEmissione >= periodo.da && f.dataEmissione <= periodo.a
  );

  const emesso = nelPeriodo.reduce((somma, f) => somma + importoConSegno(f), 0);

  // L'incassato si conta per data di **incasso**, non di emissione: una
  // fattura di dicembre pagata a gennaio è reddito di gennaio, ed è la regola
  // su cui si regge tutto il calcolo per cassa del forfettario.
  const incassato = attive(fatture)
    .filter((f) => f.dataIncasso && f.dataIncasso >= periodo.da && f.dataIncasso <= periodo.a)
    .reduce((somma, f) => somma + importoConSegno(f), 0);

  // Il non incassato è una fotografia alla fine del periodo, non un flusso:
  // tutto ciò che era emesso entro quella data e a quella data non era ancora
  // stato pagato — comprese le fatture più vecchie del periodo, che è
  // esattamente il credito che si rischia di dimenticare.
  const daIncassare = attive(fatture)
    .filter((f) => f.dataEmissione <= periodo.a)
    .filter((f) => !f.dataIncasso || f.dataIncasso > periodo.a)
    .reduce((somma, f) => somma + importoConSegno(f), 0);

  const documenti = nelPeriodo.filter((f) => f.tipoDocumento !== "TD04");
  const numeroFatture = documenti.length;

  return {
    emesso: round2(emesso),
    incassato: round2(incassato),
    daIncassare: round2(daIncassare),
    numeroFatture,
    // La media si calcola sulle sole fatture, non sulle note di credito: una
    // media che comprende importi negativi non è la fattura tipica di nessuno.
    fatturaMedia:
      numeroFatture === 0
        ? 0
        : round2(documenti.reduce((somma, f) => somma + imponibileFiscale(f), 0) / numeroFatture),
    numeroNoteCredito: nelPeriodo.length - numeroFatture,
  };
}

export interface VoceClassifica {
  chiave: string;
  etichetta: string;
  totale: number;
  quota: number;
  conteggio: number;
}

/**
 * Ordina per importo e calcola la quota sul totale.
 *
 * La quota è il motivo per cui questa funzione esiste: sapere che un cliente
 * vale 12.000 € non dice niente da solo; sapere che vale il 61% del fatturato
 * dice che se se ne va l'anno è compromesso. È la misura della concentrazione,
 * e per un professionista singolo è il rischio principale del mestiere.
 */
export function classifica(
  righe: { chiave: string; etichetta: string; importo: number }[]
): VoceClassifica[] {
  const per = new Map<string, { etichetta: string; totale: number; conteggio: number }>();
  for (const riga of righe) {
    const attuale = per.get(riga.chiave) ?? { etichetta: riga.etichetta, totale: 0, conteggio: 0 };
    attuale.totale += riga.importo;
    attuale.conteggio += 1;
    per.set(riga.chiave, attuale);
  }

  const totale = [...per.values()].reduce((somma, v) => somma + v.totale, 0);

  return [...per.entries()]
    .map(([chiave, v]) => ({
      chiave,
      etichetta: v.etichetta,
      totale: round2(v.totale),
      quota: totale === 0 ? 0 : Math.round((v.totale / totale) * 100),
      conteggio: v.conteggio,
    }))
    .sort((a, b) => b.totale - a.totale);
}

/**
 * Il fatturato per cliente nel periodo, in classifica.
 * Si conta l'**emesso**: la domanda è quanto lavoro viene da chi, e il lavoro
 * fatto conta anche se il pagamento è in ritardo.
 */
export function fatturatoPerCliente(
  fatture: Fattura[],
  periodo: Periodo,
  nomi: Map<string, string>
): VoceClassifica[] {
  return classifica(
    attive(fatture)
      .filter((f) => f.dataEmissione >= periodo.da && f.dataEmissione <= periodo.a)
      .map((f) => ({
        chiave: f.clienteId,
        etichetta: nomi.get(f.clienteId) ?? "Cliente rimosso",
        importo: importoConSegno(f),
      }))
  ).filter((voce) => voce.totale !== 0);
}

export interface SpesaAggregabile {
  data: string;
  descrizione: string;
  categoria: string | null;
  importo: number;
  fornitoreId: string | null;
}

export function spesePerCategoria(spese: SpesaAggregabile[], periodo: Periodo): VoceClassifica[] {
  return classifica(
    spese
      .filter((s) => s.data >= periodo.da && s.data <= periodo.a)
      .map((s) => ({
        chiave: s.categoria ?? "—",
        etichetta: s.categoria ?? "Senza categoria",
        importo: s.importo,
      }))
  );
}

export function spesePerFornitore(
  spese: SpesaAggregabile[],
  periodo: Periodo,
  nomi: Map<string, string>
): VoceClassifica[] {
  return classifica(
    spese
      .filter((s) => s.data >= periodo.da && s.data <= periodo.a)
      .filter((s) => s.fornitoreId !== null)
      .map((s) => ({
        chiave: s.fornitoreId as string,
        etichetta: nomi.get(s.fornitoreId as string) ?? "Fornitore rimosso",
        importo: s.importo,
      }))
  );
}

/**
 * Una riga CSV correttamente virgolettata.
 *
 * Excel in italiano si aspetta il punto e virgola come separatore e la virgola
 * come decimale: con la virgola separatrice apre tutto in una colonna sola, e
 * un export che va riformattato a mano non è un export.
 */
export function rigaCsv(campi: (string | number)[]): string {
  return campi
    .map((campo) => {
      if (typeof campo === "number") return campo.toFixed(2).replace(".", ",");
      const testo = campo ?? "";
      return /[";\n]/.test(testo) ? `"${testo.replace(/"/g, '""')}"` : testo;
    })
    .join(";");
}

export function componiCsv(intestazioni: string[], righe: (string | number)[][]): string {
  // BOM UTF-8: senza, Excel su Windows legge gli accenti come caratteri
  // sbagliati, ed è il primo motivo per cui un export "non funziona".
  return "﻿" + [rigaCsv(intestazioni), ...righe.map(rigaCsv)].join("\r\n") + "\r\n";
}
