import { round2 } from "./calcolo";

/**
 * Il lato commerciale del lavoro: cosa è in corso, quanto vale, chi è fermo da
 * troppo tempo.
 *
 * La differenza con l'anagrafica è il tempo. Un elenco di clienti dice chi
 * sono; una pipeline dice cosa sta succedendo. Oltre la decina di clienti la
 * seconda informazione non sta più in testa, e il costo di perderla non è
 * teorico: è una proposta mai richiamata.
 *
 * Modulo puro, come il resto di `lib/domain`: nessuna dipendenza da Supabase,
 * niente `new Date()` letto di nascosto — la data di riferimento si passa.
 */

export type FaseTrattativa = "contatto" | "qualificata" | "proposta" | "vinta" | "persa";

/** Ordine di avanzamento. `vinta` e `persa` chiudono e stanno fuori dal flusso. */
export const FASI_APERTE: FaseTrattativa[] = ["contatto", "qualificata", "proposta"];
export const FASI_CHIUSE: FaseTrattativa[] = ["vinta", "persa"];

export const ETICHETTE_FASE: Record<FaseTrattativa, string> = {
  contatto: "Primo contatto",
  qualificata: "Qualificata",
  proposta: "Proposta inviata",
  vinta: "Vinta",
  persa: "Persa",
};

/**
 * Probabilità suggerita quando si sposta una trattativa di fase. È un punto di
 * partenza modificabile, non una regola: due proposte allo stesso stadio
 * possono avere probabilità molto diverse, e imporre una percentuale fissa per
 * fase produce una previsione che sembra precisa e non lo è.
 */
export const PROBABILITA_SUGGERITA: Record<FaseTrattativa, number> = {
  contatto: 10,
  qualificata: 30,
  proposta: 60,
  vinta: 100,
  persa: 0,
};

export interface Trattativa {
  id: string;
  clienteId: string;
  titolo: string;
  fase: FaseTrattativa;
  valoreStimato: number;
  probabilita: number;
  dataPrevista: string | null;
  dataChiusura: string | null;
  motivoChiusura: string | null;
  note: string | null;
  aggiornataIl: string;
}

export type TipoAttivita = "chiamata" | "email" | "incontro" | "messaggio" | "nota";

export const ETICHETTE_ATTIVITA: Record<TipoAttivita, string> = {
  chiamata: "Chiamata",
  email: "Email",
  incontro: "Incontro",
  messaggio: "Messaggio",
  nota: "Nota",
};

export interface Attivita {
  id: string;
  clienteId: string;
  trattativaId: string | null;
  tipo: TipoAttivita;
  data: string;
  testo: string;
  prossimoPasso: string | null;
  dataProssimoPasso: string | null;
  fatto: boolean;
}

export function aperta(trattativa: Pick<Trattativa, "fase">): boolean {
  return FASI_APERTE.includes(trattativa.fase);
}

/**
 * Valore ponderato: quanto vale davvero la pipeline, non quanto vale se tutto
 * va bene. La somma grezza delle trattative aperte è il numero che ogni
 * venditore si racconta; moltiplicare per la probabilità dichiarata è ciò che
 * lo rende utilizzabile per decidere se accettare il prossimo lavoro.
 */
export function valorePonderato(trattative: Trattativa[]): number {
  return round2(
    trattative.filter(aperta).reduce((somma, t) => somma + t.valoreStimato * (t.probabilita / 100), 0)
  );
}

export function valoreAperto(trattative: Trattativa[]): number {
  return round2(trattative.filter(aperta).reduce((somma, t) => somma + t.valoreStimato, 0));
}

export interface ColonnaPipeline {
  fase: FaseTrattativa;
  etichetta: string;
  trattative: Trattativa[];
  totale: number;
}

/** Le tre colonne aperte, sempre tutte e tre: una colonna vuota è un'informazione. */
export function pipeline(trattative: Trattativa[]): ColonnaPipeline[] {
  return FASI_APERTE.map((fase) => {
    const dellaFase = trattative
      .filter((t) => t.fase === fase)
      .sort((a, b) => b.valoreStimato - a.valoreStimato);
    return {
      fase,
      etichetta: ETICHETTE_FASE[fase],
      trattative: dellaFase,
      totale: round2(dellaFase.reduce((somma, t) => somma + t.valoreStimato, 0)),
    };
  });
}

/** Oltre questi giorni senza un contatto, una trattativa aperta è ferma. */
export const GIORNI_PER_ESSERE_FERMA = 21;

function giorniTra(daIso: string, aIso: string): number {
  return Math.round((Date.parse(`${aIso}T00:00:00Z`) - Date.parse(`${daIso}T00:00:00Z`)) / 86_400_000);
}

export interface TrattativaFerma {
  trattativa: Trattativa;
  giorniDaUltimoContatto: number;
  ultimoContatto: string | null;
}

/**
 * Le trattative aperte su cui non si mette mano da troppo tempo.
 *
 * È la funzione che giustifica l'esistenza del modulo: nessuno perde una
 * trattativa decidendo di perderla, la si perde smettendo di seguirla senza
 * accorgersene. Il conteggio parte dall'ultima attività registrata sul cliente;
 * se non ce n'è nessuna, dall'ultimo aggiornamento della trattativa — che è
 * comunque un momento in cui qualcuno ci ha messo mano.
 */
export function trattativeFerme(
  trattative: Trattativa[],
  attivita: Attivita[],
  oggi: string,
  soglia = GIORNI_PER_ESSERE_FERMA
): TrattativaFerma[] {
  const ultimaPerCliente = new Map<string, string>();
  for (const a of attivita) {
    const attuale = ultimaPerCliente.get(a.clienteId);
    if (!attuale || a.data > attuale) ultimaPerCliente.set(a.clienteId, a.data);
  }

  return trattative
    .filter(aperta)
    .map((trattativa) => {
      const ultimoContatto = ultimaPerCliente.get(trattativa.clienteId) ?? null;
      const riferimento = ultimoContatto ?? trattativa.aggiornataIl.slice(0, 10);
      return { trattativa, ultimoContatto, giorniDaUltimoContatto: giorniTra(riferimento, oggi) };
    })
    .filter((f) => f.giorniDaUltimoContatto >= soglia)
    .sort((a, b) => b.giorniDaUltimoContatto - a.giorniDaUltimoContatto);
}

/**
 * I prossimi passi ancora da fare, dal più scaduto al più lontano. Le attività
 * senza una data di prossimo passo restano fuori: un'intenzione senza data non
 * è un impegno, e metterla in elenco insieme agli impegni li svaluta tutti.
 */
export function passiDaFare(attivita: Attivita[]): Attivita[] {
  return attivita
    .filter((a) => !a.fatto && a.dataProssimoPasso !== null)
    .sort((a, b) => (a.dataProssimoPasso ?? "").localeCompare(b.dataProssimoPasso ?? ""));
}

export interface TassoDiConversione {
  vinte: number;
  perse: number;
  /** null quando non c'è ancora nessuna trattativa chiusa: zero su zero non è zero per cento. */
  percentuale: number | null;
  valoreVinto: number;
}

export function tassoDiConversione(trattative: Trattativa[]): TassoDiConversione {
  const vinte = trattative.filter((t) => t.fase === "vinta");
  const perse = trattative.filter((t) => t.fase === "persa");
  const chiuse = vinte.length + perse.length;
  return {
    vinte: vinte.length,
    perse: perse.length,
    percentuale: chiuse === 0 ? null : Math.round((vinte.length / chiuse) * 100),
    valoreVinto: round2(vinte.reduce((somma, t) => somma + t.valoreStimato, 0)),
  };
}

export interface ValoreCliente {
  clienteId: string;
  fatturatoTotale: number;
  documenti: number;
  ultimaFattura: string | null;
}

/**
 * Quanto vale un cliente, dai documenti realmente emessi. Non è una stima: è
 * la somma di ciò che è stato fatturato, con le note di credito che sottraggono.
 * Serve a distinguere il cliente che parla molto da quello che paga.
 */
export function valorePerCliente(
  documenti: { clienteId: string; tipoDocumento: string; dataEmissione: string; totale: number; annullata: boolean }[]
): Map<string, ValoreCliente> {
  const valori = new Map<string, ValoreCliente>();

  for (const documento of documenti) {
    if (documento.annullata) continue;
    const segno = documento.tipoDocumento === "TD04" ? -1 : 1;
    const attuale = valori.get(documento.clienteId) ?? {
      clienteId: documento.clienteId,
      fatturatoTotale: 0,
      documenti: 0,
      ultimaFattura: null,
    };
    attuale.fatturatoTotale = round2(attuale.fatturatoTotale + segno * documento.totale);
    attuale.documenti += 1;
    if (!attuale.ultimaFattura || documento.dataEmissione > attuale.ultimaFattura) {
      attuale.ultimaFattura = documento.dataEmissione;
    }
    valori.set(documento.clienteId, attuale);
  }

  return valori;
}
