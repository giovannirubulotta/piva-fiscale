import { dataScadenzaPagamento, numeroFattura, totaleDocumento } from "./fattura";
import { round2 } from "./calcolo";
import type { Fattura } from "./types";

/**
 * Lo stato di incasso di una fattura emessa, e il sollecito che ne consegue.
 *
 * Un forfettario non ha un ufficio crediti: se una fattura non viene pagata,
 * l'unico modo per accorgersene è ricordarsene. Il ritardo medio di pagamento
 * in Italia rende questa la voce che più spesso separa il fatturato dal conto
 * corrente — e l'imposta si paga sull'incassato, quindi una fattura non pagata
 * non costa imposte ma costa liquidità.
 *
 * Questo modulo non manda niente a nessuno: prepara il testo e lo mostra. La
 * spedizione automatica di solleciti a nome dell'utente è una cosa che si fa
 * dopo averla decisa, non un effetto collaterale di aver aperto una pagina.
 */

export type StatoIncasso = "in_corso" | "in_scadenza" | "scaduta";

/** Entro quanti giorni dalla scadenza una fattura è "in scadenza" e non ancora "in corso". */
export const GIORNI_PREAVVISO = 7;

export interface PosizioneAperta {
  fattura: Fattura;
  dataScadenza: string;
  /** Positivo se scaduta, negativo se deve ancora scadere. */
  giorniDiRitardo: number;
  stato: StatoIncasso;
  importo: number;
}

function giorniTra(daIso: string, aIso: string): number {
  const da = Date.parse(`${daIso}T00:00:00Z`);
  const a = Date.parse(`${aIso}T00:00:00Z`);
  return Math.round((a - da) / 86_400_000);
}

function isoDi(data: Date): string {
  return data.toISOString().slice(0, 10);
}

/**
 * Le fatture emesse e non ancora incassate, dalla più in ritardo alla più
 * lontana dalla scadenza. Le note di credito restano fuori: non sono crediti da
 * incassare ma storni, e sollecitarle sarebbe imbarazzante.
 *
 * @param oggi iniettato invece che letto dall'orologio, altrimenti la funzione
 *   non è verificabile.
 */
export function posizioniAperte(fatture: Fattura[], oggi: Date): PosizioneAperta[] {
  const riferimento = isoDi(oggi);

  return fatture
    .filter((f) => f.stato === "emessa" && f.tipoDocumento !== "TD04")
    .map((fattura) => {
      const dataScadenza = dataScadenzaPagamento(fattura);
      const giorniDiRitardo = giorniTra(dataScadenza, riferimento);
      const stato: StatoIncasso =
        giorniDiRitardo > 0 ? "scaduta" : giorniDiRitardo >= -GIORNI_PREAVVISO ? "in_scadenza" : "in_corso";
      return { fattura, dataScadenza, giorniDiRitardo, stato, importo: totaleDocumento(fattura) };
    })
    .sort((a, b) => b.giorniDiRitardo - a.giorniDiRitardo);
}

export interface FasciaRitardo {
  chiave: "a_scadere" | "entro_30" | "entro_60" | "oltre_60";
  etichetta: string;
  totale: number;
  quante: number;
}

/**
 * Lo scaduto per fasce di anzianità. Le fasce non sono decorative: oltre i 60
 * giorni un credito cambia natura — smette di essere un ritardo e diventa un
 * problema da affrontare in modo diverso — e vederlo separato dal resto è ciò
 * che permette di accorgersene.
 */
export function fasceDiRitardo(posizioni: PosizioneAperta[]): FasciaRitardo[] {
  const fasce: FasciaRitardo[] = [
    { chiave: "a_scadere", etichetta: "Non ancora scadute", totale: 0, quante: 0 },
    { chiave: "entro_30", etichetta: "Scadute da meno di 30 giorni", totale: 0, quante: 0 },
    { chiave: "entro_60", etichetta: "Scadute da 30 a 60 giorni", totale: 0, quante: 0 },
    { chiave: "oltre_60", etichetta: "Scadute da oltre 60 giorni", totale: 0, quante: 0 },
  ];

  for (const posizione of posizioni) {
    const indice =
      posizione.giorniDiRitardo <= 0 ? 0 : posizione.giorniDiRitardo <= 30 ? 1 : posizione.giorniDiRitardo <= 60 ? 2 : 3;
    fasce[indice].totale = round2(fasce[indice].totale + posizione.importo);
    fasce[indice].quante += 1;
  }

  return fasce.filter((f) => f.quante > 0);
}

export function totaleAperto(posizioni: PosizioneAperta[]): number {
  return round2(posizioni.reduce((somma, p) => somma + p.importo, 0));
}

export function totaleScaduto(posizioni: PosizioneAperta[]): number {
  return round2(posizioni.filter((p) => p.stato === "scaduta").reduce((somma, p) => somma + p.importo, 0));
}

/**
 * Il testo del sollecito, da copiare in una mail.
 *
 * Il tono cambia con il ritardo, ma resta cortese anche a novanta giorni: chi
 * scrive è un professionista che vuole essere pagato *e* mantenere il cliente,
 * e un sollecito ostile ottiene raramente la prima cosa e mai la seconda. La
 * fermezza sta nei fatti — numero, data, importo, giorni — non negli aggettivi.
 *
 * Nessun riferimento agli interessi di mora: sono dovuti per legge (D.Lgs.
 * 231/2002) ma citarli è una scelta commerciale, non una formula da inserire
 * di default in ogni promemoria.
 */
export function testoSollecito(posizione: PosizioneAperta, destinatario: string, mittente: string): string {
  const { fattura, importo, dataScadenza, giorniDiRitardo } = posizione;
  const numero = numeroFattura(fattura);
  const importoTesto = importoIt(importo);
  const scadenzaTesto = dataIt(dataScadenza);

  if (giorniDiRitardo <= 0) {
    const giorni = Math.abs(giorniDiRitardo);
    return [
      `Gentile ${destinatario},`,
      "",
      `un promemoria: la fattura ${numero} di ${importoTesto} scade ${giorni === 0 ? "oggi" : `tra ${giorni} ${giorni === 1 ? "giorno" : "giorni"}`}, il ${scadenzaTesto}.`,
      "",
      "Se il pagamento è già stato disposto, ignora pure questo messaggio.",
      "",
      "Grazie,",
      mittente,
    ].join("\n");
  }

  if (giorniDiRitardo <= 30) {
    return [
      `Gentile ${destinatario},`,
      "",
      `la fattura ${numero} di ${importoTesto} risulta scaduta il ${scadenzaTesto} e non ancora saldata.`,
      "",
      "Capita: se è già in lavorazione fammelo sapere, altrimenti ti chiedo di procedere nei prossimi giorni.",
      "",
      "Grazie,",
      mittente,
    ].join("\n");
  }

  return [
    `Gentile ${destinatario},`,
    "",
    `torno sulla fattura ${numero} di ${importoTesto}, scaduta il ${scadenzaTesto}: sono passati ${giorniDiRitardo} giorni e il pagamento non risulta ancora ricevuto.`,
    "",
    "Ti chiedo di indicarmi una data entro cui posso considerarlo saldato, o di segnalarmi se c'è un problema che posso aiutare a risolvere.",
    "",
    "Resto a disposizione,",
    mittente,
  ].join("\n");
}

function dataIt(iso: string): string {
  const [anno, mese, giorno] = iso.split("-");
  return `${giorno}/${mese}/${anno}`;
}

/**
 * Formattazione locale invece di riusare `lib/ui/format`: il dominio non
 * dipende dagli strati sopra di sé, e un import da `lib/ui` invertirebbe la
 * direzione delle dipendenze per risparmiare una riga. Qui l'importo non è
 * presentazione ma contenuto di un testo che l'utente invierà.
 */
function importoIt(valore: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(valore);
}
