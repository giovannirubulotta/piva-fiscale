"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  cambiaAttivazioneRicorrente,
  creaRicorrente,
  eliminaRicorrente,
  leggiRicorrente,
  segnaUltimaEmissione,
  type NuovaRigaRicorrente,
} from "@/lib/data/ricorrenti";
import { creaFattura, prossimoProgressivo } from "@/lib/data/fatture";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { bolloDovuto } from "@/lib/domain/fattura";
import {
  MESI_PER_CADENZA,
  motivoNonEmettibile,
  occorrenzeDaEmettere,
  righePerFattura,
  type Cadenza,
} from "@/lib/domain/ricorrenza";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

const CADENZE = Object.keys(MESI_PER_CADENZA) as Cadenza[];

function leggiRighe(formData: FormData): NuovaRigaRicorrente[] {
  const descrizioni = formData.getAll("descrizione").map(String);
  const quantita = formData.getAll("quantita").map(Number);
  const prezzi = formData.getAll("prezzoUnitario").map(Number);
  const unita = formData.getAll("unitaMisura").map(String);

  return descrizioni
    .map((descrizione, i) => ({
      descrizione: descrizione.trim(),
      quantita: Number.isFinite(quantita[i]) && quantita[i] > 0 ? quantita[i] : 1,
      unitaMisura: unita[i]?.trim() || null,
      prezzoUnitario: Number.isFinite(prezzi[i]) ? prezzi[i] : 0,
    }))
    .filter((riga) => riga.descrizione.length > 0);
}

export async function salvaNuovoRicorrente(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const clienteId = String(formData.get("clienteId") ?? "");
  const descrizione = String(formData.get("descrizione_serie") ?? "").trim();
  const cadenza = String(formData.get("cadenza") ?? "");
  const dataInizio = String(formData.get("dataInizio") ?? "");
  const dataFine = String(formData.get("dataFine") ?? "") || null;
  const righe = leggiRighe(formData);

  if (!clienteId) return { ...statoVuoto, errore: "Scegli il cliente." };
  if (!descrizione) return { ...statoVuoto, errore: "Dai un nome alla serie: servirà a riconoscerla nell'elenco." };
  if (!CADENZE.includes(cadenza as Cadenza)) return { ...statoVuoto, errore: "Scegli ogni quanto si ripete." };
  if (!dataInizio) return { ...statoVuoto, errore: "Indica da quando parte." };
  if (dataFine && dataFine < dataInizio) {
    return { ...statoVuoto, errore: "La fine non può precedere l'inizio." };
  }
  if (righe.length === 0) return { ...statoVuoto, errore: "Aggiungi almeno una riga con una descrizione." };

  let id: string;
  try {
    id = await creaRicorrente(supabase, user.id, {
      clienteId,
      descrizione,
      cadenza: cadenza as Cadenza,
      dataInizio,
      dataFine,
      giorniScadenzaPagamento: Number(formData.get("giorniScadenzaPagamento")) || 30,
      modalitaPagamento: "MP05",
      condizioniPagamento: "TP02",
      causaleAggiuntiva: String(formData.get("causaleAggiuntiva") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
      righe,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "ricorrenti.salvaNuovoRicorrente",
      messaggio: "Creazione serie ricorrente non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/ricorrenti");
  redirect(`/ricorrenti/${id}`);
}

export async function cambiaAttivazione(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const attiva = String(formData.get("attiva") ?? "") === "1";
  if (!id) return;

  try {
    await cambiaAttivazioneRicorrente(supabase, user.id, id, attiva);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "ricorrenti.cambiaAttivazione",
      messaggio: "Sospensione o riattivazione della serie non riuscita.",
      causa,
    });
  }

  revalidatePath("/ricorrenti", "layout");
}

/**
 * Emette la fattura della prima scadenza ancora scoperta.
 *
 * **Una alla volta, e in bozza.** Con tre mesi di arretrati la tentazione è
 * generarli tutti in un colpo: sarebbero tre documenti fiscali con tre
 * progressivi consumati che nessuno ha riletto, e se il prezzo era cambiato a
 * gennaio bisogna stornarne tre con altrettante note di credito. Emettere la
 * più vecchia e ripresentare il pulsante costa un click in più e lascia il
 * controllo dov'era.
 *
 * `ultimaEmissione` si aggiorna **dopo** che la fattura esiste: al contrario,
 * un errore lascerebbe la serie convinta di aver fatturato un mese che non ha
 * fatturato, e quel canone non lo recupererebbe più nessuno.
 */
export async function emettiProssima(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  let fatturaId: string;
  try {
    const oggi = new Date().toISOString().slice(0, 10);
    const ricorrente = await leggiRicorrente(supabase, user.id, id);
    if (!ricorrente || motivoNonEmettibile(ricorrente, oggi)) return;

    const scadenza = occorrenzeDaEmettere(ricorrente, oggi)[0];
    const emittente = await leggiDatiEmittente(supabase, user.id);
    const righe = righePerFattura(ricorrente);
    const anno = Number(scadenza.slice(0, 4));

    fatturaId = await creaFattura(supabase, user.id, {
      clienteId: ricorrente.clienteId,
      tipoDocumento: "TD01",
      fatturaRiferimentoId: null,
      anno,
      progressivo: await prossimoProgressivo(supabase, user.id, anno, "TD01"),
      // La data della fattura è quella della scadenza maturata, non di oggi:
      // il canone di marzo emesso in ritardo resta il canone di marzo.
      dataEmissione: scadenza,
      stato: "bozza",
      bolloApplicato: bolloDovuto(righe),
      bolloRiaddebitato: emittente?.bolloRiaddebitato ?? true,
      condizioniPagamento: ricorrente.condizioniPagamento,
      modalitaPagamento: ricorrente.modalitaPagamento,
      giorniScadenzaPagamento: ricorrente.giorniScadenzaPagamento,
      causaleAggiuntiva: ricorrente.causaleAggiuntiva,
      note: `Da serie ricorrente "${ricorrente.descrizione}"`,
      ricorrenteId: ricorrente.id,
      righe,
    });

    await segnaUltimaEmissione(supabase, user.id, id, scadenza);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "ricorrenti.emettiProssima",
      messaggio: "Emissione della fattura ricorrente non riuscita.",
      causa,
    });
    return;
  }

  revalidatePath("/ricorrenti", "layout");
  revalidatePath("/fatture");
  redirect(`/fatture/${fatturaId}`);
}

export async function rimuoviRicorrente(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaRicorrente(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "ricorrenti.rimuoviRicorrente",
      messaggio: "Eliminazione della serie non riuscita.",
      causa,
    });
    return;
  }

  revalidatePath("/ricorrenti");
  redirect("/ricorrenti");
}
