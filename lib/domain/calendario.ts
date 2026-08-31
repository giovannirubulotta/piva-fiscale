import { numeroFattura, dataScadenzaPagamento } from "./fattura";
import { statoEffettivo, numeroPreventivo } from "./preventivo";
import { occorrenzeDaEmettere, prossimaOccorrenza, totaleRicorrente } from "./ricorrenza";
import type { Fattura, Scadenza } from "./types";
import type { Preventivo } from "./preventivo";
import type { Ricorrente } from "./ricorrenza";
import type { Attivita } from "./crm";

/**
 * Il calendario, cioè tutto quello che ha una data.
 *
 * **Una sola voce di questo calendario è memorizzata: l'evento che scrivi tu.**
 * Le altre cinque — scadenze fiscali, fatture in scadenza, canoni maturati,
 * preventivi che scadono, prossimi passi delle trattative — sono *derivate* da
 * dati che esistono già altrove.
 *
 * È la stessa scelta dello stato «scaduto» dei preventivi, applicata in grande:
 * una tabella di eventi copiati sarebbe vera solo finché qualcuno la
 * risincronizza. Sposti la data di una fattura e il calendario mostrerebbe
 * ancora la vecchia; annulli un preventivo e la sua scadenza resterebbe lì.
 * Derivando, il calendario non può essere in ritardo su sé stesso — e non c'è
 * nessun processo di allineamento da scrivere, sorvegliare e riparare.
 *
 * Il prezzo è che una voce derivata non si può spostare o cancellare dal
 * calendario: si cambia il dato che la genera. È il comportamento giusto — la
 * scadenza del saldo non si sposta trascinandola su un altro giorno.
 */

export type OrigineVoce =
  | "evento"
  | "scadenza_fiscale"
  | "fattura"
  | "ricorrente"
  | "preventivo"
  | "attivita";

export const ETICHETTE_ORIGINE: Record<OrigineVoce, string> = {
  evento: "Agenda",
  scadenza_fiscale: "Fisco",
  fattura: "Incassi",
  ricorrente: "Canoni",
  preventivo: "Preventivi",
  attivita: "Trattative",
};

/** Il tono con cui la voce si presenta. Non decora: dice se richiede un'azione. */
export type TonoVoce = "neutro" | "accento" | "ok" | "warn" | "danger";

export interface VoceCalendario {
  /** Stabile tra due caricamenti: serve come chiave di React e come UID nel file .ics. */
  chiave: string;
  data: string;
  ora: string | null;
  titolo: string;
  dettaglio: string | null;
  origine: OrigineVoce;
  tono: TonoVoce;
  /** Dove si va per agire su questa voce. `null` per ciò che non ha una pagina propria. */
  href: string | null;
  importo: number | null;
  /** Una voce derivata non si sposta né si cancella: si cambia il dato che la genera. */
  modificabile: boolean;
}

export interface EventoProprio {
  id: string;
  titolo: string;
  descrizione: string | null;
  dataInizio: string;
  dataFine: string | null;
  oraInizio: string | null;
  oraFine: string | null;
  tuttoIlGiorno: boolean;
  luogo: string | null;
  tipo: "appuntamento" | "promemoria" | "impegno" | "ferie";
  clienteId: string | null;
  trattativaId: string | null;
}

export const ETICHETTE_TIPO_EVENTO: Record<EventoProprio["tipo"], string> = {
  appuntamento: "Appuntamento",
  promemoria: "Promemoria",
  impegno: "Impegno",
  ferie: "Ferie",
};

export interface SorgentiCalendario {
  eventi: EventoProprio[];
  scadenzeFiscali: Scadenza[];
  /** Le scadenze già segnate come pagate: non spariscono, ma cambiano tono. */
  scadenzePagate: Set<string>;
  fatture: Fattura[];
  preventivi: Preventivo[];
  ricorrenti: Ricorrente[];
  attivita: Attivita[];
  nomiClienti: Map<string, string>;
}

/**
 * Tutte le voci, da tutte le sorgenti, ordinate per data e ora.
 *
 * Le voci senza ora vengono prima di quelle con ora nello stesso giorno: gli
 * impegni a tutto il giorno inquadrano la giornata, gli appuntamenti la
 * riempiono.
 */
export function vociCalendario(sorgenti: SorgentiCalendario, oggi: string): VoceCalendario[] {
  const voci: VoceCalendario[] = [
    ...vociDaEventi(sorgenti.eventi),
    ...vociDaScadenzeFiscali(sorgenti.scadenzeFiscali, sorgenti.scadenzePagate, oggi),
    ...vociDaFatture(sorgenti.fatture, sorgenti.nomiClienti, oggi),
    ...vociDaRicorrenti(sorgenti.ricorrenti, sorgenti.nomiClienti, oggi),
    ...vociDaPreventivi(sorgenti.preventivi, sorgenti.nomiClienti, oggi),
    ...vociDaAttivita(sorgenti.attivita, sorgenti.nomiClienti, oggi),
  ];

  return voci.sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    if (a.ora === b.ora) return a.titolo.localeCompare(b.titolo);
    if (a.ora === null) return -1;
    if (b.ora === null) return 1;
    return a.ora.localeCompare(b.ora);
  });
}

function vociDaEventi(eventi: EventoProprio[]): VoceCalendario[] {
  return eventi.map((evento) => ({
    chiave: `evento:${evento.id}`,
    data: evento.dataInizio,
    ora: evento.tuttoIlGiorno ? null : (evento.oraInizio?.slice(0, 5) ?? null),
    titolo: evento.titolo,
    dettaglio: [ETICHETTE_TIPO_EVENTO[evento.tipo], evento.luogo].filter(Boolean).join(" · ") || null,
    origine: "evento",
    tono: evento.tipo === "ferie" ? "ok" : "accento",
    href: "/calendario",
    importo: null,
    modificabile: true,
  }));
}

function vociDaScadenzeFiscali(
  scadenze: Scadenza[],
  pagate: Set<string>,
  oggi: string
): VoceCalendario[] {
  return scadenze.map((scadenza) => {
    const pagata = pagate.has(scadenza.chiave);
    return {
      chiave: `fisco:${scadenza.chiave}`,
      data: scadenza.dataScadenza,
      ora: null,
      titolo: scadenza.descrizione,
      dettaglio: pagata ? "già versata" : `codice tributo ${scadenza.codiceTributo}`,
      origine: "scadenza_fiscale" as const,
      tono: pagata ? "ok" : scadenza.dataScadenza < oggi ? "danger" : "warn",
      href: "/scadenze",
      importo: scadenza.importo,
      modificabile: false,
    };
  });
}

function vociDaFatture(
  fatture: Fattura[],
  nomi: Map<string, string>,
  oggi: string
): VoceCalendario[] {
  return fatture
    .filter((fattura) => fattura.stato === "emessa" && fattura.tipoDocumento !== "TD04")
    .map((fattura) => {
      const scadenza = dataScadenzaPagamento(fattura);
      return {
        chiave: `fattura:${fattura.id}`,
        data: scadenza,
        ora: null,
        titolo: `Incasso ${numeroFattura(fattura)} — ${nomi.get(fattura.clienteId) ?? "cliente rimosso"}`,
        dettaglio: scadenza < oggi ? "in ritardo" : "in scadenza",
        origine: "fattura" as const,
        tono: scadenza < oggi ? "danger" : "warn",
        href: `/fatture/${fattura.id}`,
        importo: null,
        modificabile: false,
      };
    });
}

function vociDaRicorrenti(
  ricorrenti: Ricorrente[],
  nomi: Map<string, string>,
  oggi: string
): VoceCalendario[] {
  const voci: VoceCalendario[] = [];

  for (const ricorrente of ricorrenti) {
    const cliente = nomi.get(ricorrente.clienteId) ?? "cliente rimosso";

    // Gli arretrati: una voce per ogni scadenza maturata e non fatturata,
    // nel giorno in cui era dovuta. Accorparle in una sola perderebbe
    // l'informazione di quanto indietro si è.
    for (const data of occorrenzeDaEmettere(ricorrente, oggi)) {
      voci.push({
        chiave: `ricorrente:${ricorrente.id}:${data}`,
        data,
        ora: null,
        titolo: `Da fatturare: ${ricorrente.descrizione}`,
        dettaglio: cliente,
        origine: "ricorrente",
        tono: "warn",
        href: `/ricorrenti/${ricorrente.id}`,
        importo: totaleRicorrente(ricorrente),
        modificabile: false,
      });
    }

    // E la prossima in arrivo, per sapere che sta per succedere.
    const prossima = ricorrente.attiva ? prossimaOccorrenza(ricorrente, oggi) : null;
    if (prossima) {
      voci.push({
        chiave: `ricorrente:${ricorrente.id}:${prossima}`,
        data: prossima,
        ora: null,
        titolo: ricorrente.descrizione,
        dettaglio: `${cliente} · canone in scadenza`,
        origine: "ricorrente",
        tono: "neutro",
        href: `/ricorrenti/${ricorrente.id}`,
        importo: totaleRicorrente(ricorrente),
        modificabile: false,
      });
    }
  }

  return voci;
}

function vociDaPreventivi(
  preventivi: Preventivo[],
  nomi: Map<string, string>,
  oggi: string
): VoceCalendario[] {
  return preventivi
    .filter((preventivo) => statoEffettivo(preventivo, oggi) === "inviato")
    .map((preventivo) => ({
      chiave: `preventivo:${preventivo.id}`,
      data: preventivo.validoFinoAl,
      ora: null,
      titolo: `Scade ${numeroPreventivo(preventivo)} — ${nomi.get(preventivo.clienteId) ?? "cliente rimosso"}`,
      dettaglio: preventivo.oggetto ?? "offerta in attesa di risposta",
      origine: "preventivo" as const,
      tono: "accento" as const,
      href: `/preventivi/${preventivo.id}`,
      importo: null,
      modificabile: false,
    }));
}

function vociDaAttivita(
  attivita: Attivita[],
  nomi: Map<string, string>,
  oggi: string
): VoceCalendario[] {
  return attivita
    .filter((a) => !a.fatto && a.dataProssimoPasso && a.prossimoPasso)
    .map((a) => ({
      chiave: `attivita:${a.id}`,
      data: a.dataProssimoPasso as string,
      ora: null,
      titolo: a.prossimoPasso as string,
      dettaglio: nomi.get(a.clienteId) ?? "cliente rimosso",
      origine: "attivita" as const,
      tono: (a.dataProssimoPasso as string) < oggi ? "danger" : "accento",
      href: "/crm",
      importo: null,
      modificabile: false,
    }));
}

/** Le voci di un giorno solo. */
export function vociDelGiorno(voci: VoceCalendario[], data: string): VoceCalendario[] {
  return voci.filter((voce) => voce.data === data);
}

export interface GiornoCalendario {
  data: string;
  /** false per i giorni di riempimento del mese precedente o successivo. */
  nelMese: boolean;
  oggi: boolean;
  voci: VoceCalendario[];
}

/**
 * La griglia di un mese, sempre di settimane intere e sempre a partire da
 * lunedì — che è come si legge un calendario in Italia, non domenica come nel
 * mondo anglosassone.
 *
 * I giorni di riempimento ci sono davvero, con le loro voci: una griglia che
 * lascia buchi bianchi ai bordi nasconde ciò che succede il 31 del mese prima.
 */
export function grigliaMese(anno: number, mese: number, voci: VoceCalendario[], oggi: string): GiornoCalendario[] {
  const primo = new Date(Date.UTC(anno, mese - 1, 1));
  // getUTCDay(): 0 = domenica. Con lunedì come primo giorno, domenica vale 6.
  const scarto = (primo.getUTCDay() + 6) % 7;
  const inizio = new Date(primo);
  inizio.setUTCDate(primo.getUTCDate() - scarto);

  const perData = new Map<string, VoceCalendario[]>();
  for (const voce of voci) {
    const esistenti = perData.get(voce.data);
    if (esistenti) esistenti.push(voce);
    else perData.set(voce.data, [voce]);
  }

  const giorni: GiornoCalendario[] = [];
  for (let i = 0; i < 42; i += 1) {
    const giorno = new Date(inizio);
    giorno.setUTCDate(inizio.getUTCDate() + i);
    const data = giorno.toISOString().slice(0, 10);
    giorni.push({
      data,
      nelMese: giorno.getUTCMonth() === mese - 1,
      oggi: data === oggi,
      voci: perData.get(data) ?? [],
    });
  }

  // Sei righe servono solo quando il mese lo richiede: un mese che sta in
  // cinque non deve trascinarsi dietro una riga di soli riempimenti.
  const ultimaRigaTuttaFuori = giorni.slice(35).every((giorno) => !giorno.nelMese);
  return ultimaRigaTuttaFuori ? giorni.slice(0, 35) : giorni;
}

export interface RiepilogoAgenda {
  inRitardo: VoceCalendario[];
  oggi: VoceCalendario[];
  prossimiSette: VoceCalendario[];
}

/**
 * Cosa guardare adesso. «In ritardo» prima di «oggi» perché ciò che è già
 * scaduto è più urgente di ciò che scade, e in un elenco ordinato per data
 * finirebbe in cima solo per caso.
 */
export function agenda(voci: VoceCalendario[], oggi: string): RiepilogoAgenda {
  const fraSette = aggiungiGiorni(oggi, 7);
  return {
    inRitardo: voci.filter((v) => v.data < oggi && (v.tono === "danger" || v.tono === "warn")),
    oggi: voci.filter((v) => v.data === oggi),
    prossimiSette: voci.filter((v) => v.data > oggi && v.data <= fraSette),
  };
}

export function aggiungiGiorni(iso: string, giorni: number): string {
  const data = new Date(`${iso}T00:00:00Z`);
  data.setUTCDate(data.getUTCDate() + giorni);
  return data.toISOString().slice(0, 10);
}

/**
 * Il calendario in formato iCalendar (RFC 5545), da sottoscrivere in Google
 * Calendar, Apple Calendario o Outlook.
 *
 * Le righe si spezzano a 75 ottetti come impone lo standard: i lettori
 * severi rifiutano il file intero su una riga troppo lunga, e una descrizione
 * di due frasi la supera senza problemi. Il taglio conta i **byte** UTF-8, non
 * i caratteri: spezzare in mezzo a una «à» produrrebbe byte non validi.
 */
export function generaIcs(voci: VoceCalendario[], nomeCalendario: string, adesso: Date): string {
  const timbro = adesso.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const righe: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GAR Studio//Calendario//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapaIcs(nomeCalendario)}`,
    // Ogni 4 ore: il calendario cambia quando cambiano i dati che lo
    // generano, non a orari fissi, ma è il suggerimento che i lettori
    // rispettano più spesso.
    "X-PUBLISHED-TTL:PT4H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT4H",
  ];

  for (const voce of voci) {
    const compatta = voce.data.replace(/-/g, "");
    righe.push("BEGIN:VEVENT");
    // L'UID deve restare lo stesso tra due generazioni, altrimenti a ogni
    // aggiornamento il lettore cancella e ricrea tutto, perdendo le notifiche
    // che l'utente ha impostato sui singoli eventi.
    righe.push(`UID:${escapaIcs(voce.chiave)}@gar-studio`);
    righe.push(`DTSTAMP:${timbro}`);

    if (voce.ora) {
      const oraCompatta = `${voce.ora.replace(":", "")}00`;
      // Senza TZID e senza Z: ora locale fluttuante. Un appuntamento alle 9
      // resta alle 9 anche se il lettore è su un altro fuso, che per
      // un'agenda personale è il comportamento atteso.
      righe.push(`DTSTART:${compatta}T${oraCompatta}`);
    } else {
      righe.push(`DTSTART;VALUE=DATE:${compatta}`);
      // In un evento a tutto il giorno DTEND è esclusivo: senza il giorno
      // dopo, molti lettori mostrano un evento di durata zero o lo saltano.
      righe.push(`DTEND;VALUE=DATE:${aggiungiGiorni(voce.data, 1).replace(/-/g, "")}`);
    }

    righe.push(`SUMMARY:${escapaIcs(voce.titolo)}`);
    const descrizione = [voce.dettaglio, ETICHETTE_ORIGINE[voce.origine]].filter(Boolean).join(" — ");
    if (descrizione) righe.push(`DESCRIPTION:${escapaIcs(descrizione)}`);
    righe.push(`CATEGORIES:${escapaIcs(ETICHETTE_ORIGINE[voce.origine])}`);
    righe.push("END:VEVENT");
  }

  righe.push("END:VCALENDAR");
  // CRLF è obbligatorio nello standard, non una preferenza di Windows.
  return righe.map(piegaRiga).join("\r\n") + "\r\n";
}

/** Caratteri che in iCalendar hanno un significato e vanno protetti. */
function escapaIcs(testo: string): string {
  return testo
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Piega una riga a 75 ottetti, continuandola con uno spazio iniziale.
 * Il conteggio è in byte UTF-8: tagliare a metà di un carattere accentato
 * produrrebbe una sequenza non valida.
 */
function piegaRiga(riga: string): string {
  const byte = Buffer.from(riga, "utf8");
  if (byte.length <= 75) return riga;

  const pezzi: string[] = [];
  let inizio = 0;
  let limite = 75;
  while (inizio < byte.length) {
    let fine = Math.min(inizio + limite, byte.length);
    // Indietreggia finché il taglio non cade su un byte di continuazione
    // (10xxxxxx), cioè in mezzo a un carattere multibyte.
    while (fine < byte.length && (byte[fine] & 0xc0) === 0x80) fine -= 1;
    pezzi.push(byte.subarray(inizio, fine).toString("utf8"));
    inizio = fine;
    // Le righe di continuazione perdono un ottetto per lo spazio iniziale.
    limite = 74;
  }
  return pezzi.join("\r\n ");
}
