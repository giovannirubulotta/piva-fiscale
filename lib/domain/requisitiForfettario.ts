import type {
  DettaglioRequisito,
  EsitoRequisitiForfettario,
  EsitoSoglia,
  RequisitiForfettario,
  ValutazioneSoglieForfettario,
} from "./types";

/**
 * Sopra questa soglia si esce dal regime forfettario a partire dall'anno
 * successivo (permanenza nell'anno in corso comunque garantita).
 */
export const SOGLIA_PERMANENZA = 85_000;
/**
 * Sopra questa soglia l'uscita è immediata: si applica l'IVA già alle
 * operazioni successive al superamento, nello stesso anno.
 */
export const SOGLIA_USCITA_IMMEDIATA = 100_000;

interface CampoRequisito {
  chiave: string;
  valore: boolean | null;
  descrizione: string;
}

function campiRequisito(requisiti: RequisitiForfettario | null): CampoRequisito[] {
  return [
    {
      chiave: "reddito_lavoro_dipendente",
      valore: requisiti?.redditoLavoroDipendenteOltreSoglia ?? null,
      descrizione:
        "Redditi da lavoro dipendente o assimilati (incluse pensioni) superiori a 35.000 € nell'anno precedente.",
    },
    {
      chiave: "partecipazioni_societa",
      valore: requisiti?.partecipazioniSocietaRiconducibili ?? null,
      descrizione:
        "Partecipazioni in società di persone, associazioni professionali o SRL a controllo diretto/indiretto che svolgono un'attività economica riconducibile alla tua.",
    },
    {
      chiave: "committente_prevalente_ex_datore",
      valore: requisiti?.committentePrevalenteExDatore ?? null,
      descrizione:
        "Nell'anno svolgi l'attività prevalentemente per un committente che è stato tuo datore di lavoro nei due anni precedenti (o un soggetto a lui direttamente/indirettamente riconducibile).",
    },
    {
      chiave: "residenza_fuori_ue",
      valore: requisiti?.residenzaFuoriUeSee ?? null,
      descrizione: "Residenza fiscale fuori dall'Unione Europea o dallo Spazio Economico Europeo.",
    },
  ];
}

/**
 * Valuta le 4 cause di esclusione soggettive dal regime forfettario
 * (art. 1 commi 57 e 71 L. 190/2014) a partire da un'autovalutazione
 * dichiarata dall'utente. `requisiti === null` (nessuna dichiarazione mai
 * salvata) equivale a tutti i campi non verificati.
 *
 * Non è un accertamento: registra solo ciò che l'utente ha dichiarato di
 * aver controllato. Un "escluso" qui significa che l'utente stesso ha
 * confermato di trovarsi in una causa di esclusione, non che il sistema
 * l'abbia dedotto autonomamente.
 */
export function valutaRequisitiForfettario(requisiti: RequisitiForfettario | null): EsitoRequisitiForfettario {
  const dettagli: DettaglioRequisito[] = campiRequisito(requisiti).map((campo) => ({
    chiave: campo.chiave,
    descrizione: campo.descrizione,
    esito: campo.valore === true ? "escluso" : campo.valore === false ? "ok" : "da_verificare",
  }));

  const esitoGlobale = dettagli.some((d) => d.esito === "escluso")
    ? "escluso"
    : dettagli.some((d) => d.esito === "da_verificare")
      ? "da_verificare"
      : "ok";

  return { esitoGlobale, dettagli };
}

/**
 * Valuta la posizione rispetto alle soglie di fatturato del regime
 * forfettario (art. 1 comma 54 e comma 71 L. 190/2014, soglie 2023+).
 * Riceve il fatturato già incassato nell'anno (tassazione per cassa),
 * calcolato altrove con `fatturatoIncassatoAnno` — nessuna duplicazione
 * della logica di filtro sugli incassi.
 */
export function valutaSoglieForfettario(fatturatoIncassato: number): ValutazioneSoglieForfettario {
  let esito: EsitoSoglia;
  let messaggio: string;

  if (fatturatoIncassato > SOGLIA_USCITA_IMMEDIATA) {
    esito = "sopra_uscita_immediata";
    messaggio =
      "Superati i 100.000 €: uscita immediata dal regime forfettario, con applicazione dell'IVA già sulle operazioni successive al superamento.";
  } else if (fatturatoIncassato > SOGLIA_PERMANENZA) {
    esito = "sopra_permanenza";
    messaggio =
      "Superati gli 85.000 €: quest'anno resti nel regime forfettario, ma dal 1° gennaio successivo passi al regime ordinario.";
  } else {
    esito = "sotto_permanenza";
    messaggio = "Sotto la soglia di 85.000 €: nessun rischio di uscita dal regime forfettario per quest'anno.";
  }

  return { fatturatoIncassato, esito, messaggio };
}
