"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  cambiaStatoPreventivo,
  collegaFattura,
  creaPreventivo,
  eliminaPreventivo,
  leggiPreventivo,
  prossimoProgressivoPreventivo,
  type NuovaRigaPreventivo,
} from "@/lib/data/preventivi";
import { creaFattura, prossimoProgressivo } from "@/lib/data/fatture";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { bolloDovuto } from "@/lib/domain/fattura";
import { motivoNonConvertibile, righePerFattura } from "@/lib/domain/preventivo";
import type { StatoPreventivo } from "@/lib/domain/preventivo";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

const STATI: StatoPreventivo[] = ["bozza", "inviato", "accettato", "rifiutato"];

/** Le righe arrivano come array paralleli dal form, stessa convenzione delle fatture. */
function leggiRighe(formData: FormData): NuovaRigaPreventivo[] {
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

export async function salvaNuovoPreventivo(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const clienteId = String(formData.get("clienteId") ?? "");
  const dataEmissione = String(formData.get("dataEmissione") ?? "");
  const validoFinoAl = String(formData.get("validoFinoAl") ?? "");
  const righe = leggiRighe(formData);

  if (!clienteId) return { ...statoVuoto, errore: "Scegli il cliente." };
  if (!dataEmissione) return { ...statoVuoto, errore: "Indica la data del preventivo." };
  if (!validoFinoAl) return { ...statoVuoto, errore: "Indica fino a quando l'offerta resta valida." };
  if (validoFinoAl < dataEmissione) {
    return { ...statoVuoto, errore: "La validità non può finire prima della data del preventivo." };
  }
  if (righe.length === 0) return { ...statoVuoto, errore: "Aggiungi almeno una riga con una descrizione." };

  let id: string;
  try {
    const anno = Number(dataEmissione.slice(0, 4));
    id = await creaPreventivo(supabase, user.id, {
      clienteId,
      anno,
      progressivo: await prossimoProgressivoPreventivo(supabase, user.id, anno),
      dataEmissione,
      validoFinoAl,
      stato: "bozza",
      oggetto: String(formData.get("oggetto") ?? "").trim() || null,
      condizioni: String(formData.get("condizioni") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
      righe,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "preventivi.salvaNuovoPreventivo",
      messaggio: "Creazione preventivo non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/preventivi");
  redirect(`/preventivi/${id}`);
}

export async function cambiaStato(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const stato = String(formData.get("stato") ?? "");
  if (!id || !STATI.includes(stato as StatoPreventivo)) return;

  try {
    await cambiaStatoPreventivo(supabase, user.id, id, stato as StatoPreventivo);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "preventivi.cambiaStato",
      messaggio: "Cambio di stato del preventivo non riuscito.",
      causa,
    });
  }

  revalidatePath("/preventivi", "layout");
}

/**
 * Trasforma un preventivo accettato in una fattura.
 *
 * La fattura nasce **in bozza**, non emessa: convertire è un gesto di comodità,
 * emettere un documento fiscale è una decisione. Le righe sono copiate, non
 * collegate — da qui in poi i due documenti hanno vite separate, e correggere
 * la fattura non deve riscrivere l'offerta che il cliente ha accettato, che
 * resta la prova di cosa era stato pattuito.
 */
export async function convertiInFattura(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  let fatturaId: string;
  try {
    const preventivo = await leggiPreventivo(supabase, user.id, id);
    if (!preventivo || motivoNonConvertibile(preventivo)) return;

    const emittente = await leggiDatiEmittente(supabase, user.id);
    const righe = righePerFattura(preventivo);
    const oggi = new Date().toISOString().slice(0, 10);
    const anno = Number(oggi.slice(0, 4));

    fatturaId = await creaFattura(supabase, user.id, {
      clienteId: preventivo.clienteId,
      tipoDocumento: "TD01",
      fatturaRiferimentoId: null,
      anno,
      progressivo: await prossimoProgressivo(supabase, user.id, anno, "TD01"),
      dataEmissione: oggi,
      stato: "bozza",
      bolloApplicato: bolloDovuto(righe),
      bolloRiaddebitato: emittente?.bolloRiaddebitato ?? true,
      condizioniPagamento: "TP02",
      modalitaPagamento: "MP05",
      giorniScadenzaPagamento: 30,
      causaleAggiuntiva: null,
      note: `Da preventivo P${preventivo.progressivo}/${preventivo.anno}`,
      righe,
    });

    await collegaFattura(supabase, user.id, id, fatturaId);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "preventivi.convertiInFattura",
      messaggio: "Conversione del preventivo in fattura non riuscita.",
      causa,
    });
    return;
  }

  revalidatePath("/preventivi", "layout");
  revalidatePath("/fatture");
  redirect(`/fatture/${fatturaId}`);
}

export async function rimuoviPreventivo(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaPreventivo(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "preventivi.rimuoviPreventivo",
      messaggio: "Eliminazione preventivo non riuscita.",
      causa,
    });
    return;
  }

  revalidatePath("/preventivi");
  redirect("/preventivi");
}
