import { ETICHETTE_ATTIVITA, type Attivita } from "./crm";
import { numeroFattura, totaleDocumento } from "./fattura";
import { numeroPreventivo, statoEffettivo, totalePreventivo, type Preventivo } from "./preventivo";
import { intestazione, type Nota } from "./nota";
import type { EventoProprio } from "./calendario";
import type { Fattura } from "./types";

/**
 * La cronologia di un cliente: tutto quello che è successo con quella persona,
 * in un flusso solo.
 *
 * È la vista che distingue un CRM da tre elenchi affiancati. Prima di una
 * telefonata non serve sapere «le fatture» e «i contatti» e «i preventivi»
 * come categorie separate: serve sapere **cosa è successo ultimamente**, che è
 * una domanda cronologica. Tre elenchi paralleli costringono a ricostruire a
 * mente l'ordine dei fatti — ed è esattamente l'operazione che si sbaglia
 * mentre il telefono squilla.
 *
 * Come il calendario, deriva da ciò che esiste già: nessuna tabella di
 * "eventi del cliente" da tenere allineata.
 */

export type TipoVoceCronologia =
  | "attivita"
  | "nota"
  | "preventivo"
  | "fattura"
  | "incasso"
  | "evento";

export const ETICHETTE_VOCE: Record<TipoVoceCronologia, string> = {
  attivita: "Contatto",
  nota: "Nota",
  preventivo: "Preventivo",
  fattura: "Fattura",
  incasso: "Incasso",
  evento: "Agenda",
};

export type TonoVoce = "neutro" | "accento" | "ok" | "warn" | "danger";

export interface VoceCronologia {
  chiave: string;
  data: string;
  tipo: TipoVoceCronologia;
  titolo: string;
  dettaglio: string | null;
  importo: number | null;
  href: string | null;
  tono: TonoVoce;
  /** true per ciò che deve ancora succedere: si mostra sopra la linea del presente. */
  futuro: boolean;
}

export interface SorgentiCronologia {
  attivita: Attivita[];
  note: Nota[];
  preventivi: Preventivo[];
  fatture: Fattura[];
  eventi: EventoProprio[];
}

/**
 * Il flusso, dal più recente al più vecchio.
 *
 * Una fattura genera **due** voci quando è stata incassata: l'emissione e
 * l'incasso, ciascuna alla propria data. Sono due fatti distinti che possono
 * distare mesi, e schiacciarli in una riga sola cancella proprio
 * l'informazione che interessa — quanto ci ha messo a pagare.
 */
export function cronologia(sorgenti: SorgentiCronologia, oggi: string): VoceCronologia[] {
  const voci: VoceCronologia[] = [];

  for (const a of sorgenti.attivita) {
    voci.push({
      chiave: `attivita:${a.id}`,
      data: a.data,
      tipo: "attivita",
      titolo: a.testo,
      dettaglio: ETICHETTE_ATTIVITA[a.tipo],
      importo: null,
      href: null,
      tono: "neutro",
      futuro: false,
    });

    // Il prossimo passo è una voce a sé, alla sua data: è ciò che deve ancora
    // succedere, e messo insieme al contatto che l'ha generato si perderebbe
    // in fondo alla cronologia invece di stare in cima.
    if (a.prossimoPasso && a.dataProssimoPasso && !a.fatto) {
      voci.push({
        chiave: `passo:${a.id}`,
        data: a.dataProssimoPasso,
        tipo: "attivita",
        titolo: a.prossimoPasso,
        dettaglio: "da fare",
        importo: null,
        href: "/crm",
        tono: a.dataProssimoPasso < oggi ? "danger" : "accento",
        futuro: a.dataProssimoPasso >= oggi,
      });
    }
  }

  for (const nota of sorgenti.note) {
    voci.push({
      chiave: `nota:${nota.id}`,
      // La data della cronologia è quella dell'ultima modifica: una nota
      // ripresa e ampliata è tornata attuale.
      data: nota.aggiornataIl.slice(0, 10),
      tipo: "nota",
      titolo: intestazione(nota),
      dettaglio: nota.etichette.length > 0 ? nota.etichette.join(", ") : null,
      importo: null,
      href: "/note",
      tono: "neutro",
      futuro: false,
    });
  }

  for (const preventivo of sorgenti.preventivi) {
    const stato = statoEffettivo(preventivo, oggi);
    voci.push({
      chiave: `preventivo:${preventivo.id}`,
      data: preventivo.dataEmissione,
      tipo: "preventivo",
      titolo: `${numeroPreventivo(preventivo)} — ${preventivo.oggetto ?? "preventivo"}`,
      dettaglio:
        stato === "scaduto"
          ? `scaduto il ${preventivo.validoFinoAl}`
          : stato === "inviato"
            ? `valido fino al ${preventivo.validoFinoAl}`
            : stato,
      importo: totalePreventivo(preventivo),
      href: `/preventivi/${preventivo.id}`,
      tono:
        stato === "accettato" ? "ok" : stato === "rifiutato" ? "danger" : stato === "scaduto" ? "warn" : "accento",
      futuro: false,
    });
  }

  for (const fattura of sorgenti.fatture) {
    if (fattura.stato === "annullata") continue;

    const nota = fattura.tipoDocumento === "TD04";
    voci.push({
      chiave: `fattura:${fattura.id}`,
      data: fattura.dataEmissione,
      tipo: "fattura",
      titolo: `${nota ? "Nota di credito" : "Fattura"} ${numeroFattura(fattura)}`,
      dettaglio: fattura.stato === "bozza" ? "in bozza" : "emessa",
      importo: nota ? -totaleDocumento(fattura) : totaleDocumento(fattura),
      href: `/fatture/${fattura.id}`,
      tono: nota ? "warn" : "accento",
      futuro: false,
    });

    if (fattura.dataIncasso) {
      voci.push({
        chiave: `incasso:${fattura.id}`,
        data: fattura.dataIncasso,
        tipo: "incasso",
        titolo: `Incassata ${numeroFattura(fattura)}`,
        dettaglio: `${giorniTra(fattura.dataEmissione, fattura.dataIncasso)} giorni dall'emissione`,
        importo: totaleDocumento(fattura),
        href: `/fatture/${fattura.id}`,
        tono: "ok",
        futuro: false,
      });
    }
  }

  for (const evento of sorgenti.eventi) {
    voci.push({
      chiave: `evento:${evento.id}`,
      data: evento.dataInizio,
      tipo: "evento",
      titolo: evento.titolo,
      dettaglio: [evento.oraInizio?.slice(0, 5), evento.luogo].filter(Boolean).join(" · ") || null,
      importo: null,
      href: "/calendario",
      tono: "accento",
      futuro: evento.dataInizio >= oggi,
    });
  }

  return voci.sort((a, b) => b.data.localeCompare(a.data) || a.titolo.localeCompare(b.titolo));
}

function giorniTra(da: string, a: string): number {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86_400_000);
}

export interface RiepilogoRapporto {
  /** Quando c'è stato l'ultimo fatto qualsiasi, escluso ciò che deve ancora succedere. */
  ultimoContatto: string | null;
  giorniDaUltimoContatto: number | null;
  fatturatoTotale: number;
  /** Giorni medi tra emissione e incasso: come paga, non quanto. */
  giorniMediDiIncasso: number | null;
  fattureNonPagate: number;
  inProgramma: VoceCronologia[];
}

/**
 * Il ritratto del rapporto in cinque numeri.
 *
 * `giorniMediDiIncasso` è il dato che nessun cliente dichiara di sé: dice come
 * paga, e su di esso si decide se chiedere un acconto la prossima volta. Si
 * calcola solo sulle fatture davvero incassate — mediare anche quelle ancora
 * aperte darebbe un numero che migliora da solo col passare del tempo.
 */
export function riepilogoRapporto(
  voci: VoceCronologia[],
  fatture: Fattura[],
  oggi: string
): RiepilogoRapporto {
  const passate = voci.filter((v) => !v.futuro && v.data <= oggi);
  const ultimo = passate[0]?.data ?? null;

  const attive = fatture.filter((f) => f.stato !== "annullata" && f.tipoDocumento !== "TD04");
  const incassate = attive.filter((f) => f.dataIncasso);

  return {
    ultimoContatto: ultimo,
    giorniDaUltimoContatto: ultimo ? giorniTra(ultimo, oggi) : null,
    fatturatoTotale: attive.reduce((somma, f) => somma + totaleDocumento(f), 0),
    giorniMediDiIncasso:
      incassate.length === 0
        ? null
        : Math.round(
            incassate.reduce((somma, f) => somma + giorniTra(f.dataEmissione, f.dataIncasso as string), 0) /
              incassate.length
          ),
    fattureNonPagate: attive.filter((f) => f.stato === "emessa").length,
    inProgramma: voci.filter((v) => v.futuro),
  };
}
