"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { creaEvento, eliminaEvento } from "@/lib/data/eventi";
import type { EventoProprio } from "@/lib/domain/calendario";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

const TIPI: EventoProprio["tipo"][] = ["appuntamento", "promemoria", "impegno", "ferie"];

export async function aggiungiEvento(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const titolo = String(formData.get("titolo") ?? "").trim();
  const dataInizio = String(formData.get("dataInizio") ?? "");
  const dataFine = String(formData.get("dataFine") ?? "") || null;
  const oraInizio = String(formData.get("oraInizio") ?? "") || null;
  const oraFine = String(formData.get("oraFine") ?? "") || null;
  const tipo = String(formData.get("tipo") ?? "appuntamento");

  if (!titolo) return { ...statoVuoto, errore: "Dai un titolo all'evento." };
  if (!dataInizio) return { ...statoVuoto, errore: "Indica la data." };
  if (dataFine && dataFine < dataInizio) {
    return { ...statoVuoto, errore: "La fine non può precedere l'inizio." };
  }
  if (!TIPI.includes(tipo as EventoProprio["tipo"])) {
    return { ...statoVuoto, errore: "Tipo di evento non riconosciuto." };
  }
  if (oraFine && !oraInizio) {
    return { ...statoVuoto, errore: "Un'ora di fine senza ora di inizio non dice niente." };
  }
  if (oraInizio && oraFine && oraFine < oraInizio) {
    return { ...statoVuoto, errore: "L'evento finirebbe prima di cominciare." };
  }

  try {
    await creaEvento(supabase, user.id, {
      titolo,
      descrizione: String(formData.get("descrizione") ?? "").trim() || null,
      dataInizio,
      dataFine,
      oraInizio,
      oraFine,
      // Senza un'ora di inizio l'evento occupa la giornata: è la lettura
      // naturale di «giovedì, consegna», non un valore da chiedere a parte.
      tuttoIlGiorno: !oraInizio,
      luogo: String(formData.get("luogo") ?? "").trim() || null,
      tipo: tipo as EventoProprio["tipo"],
      clienteId: String(formData.get("clienteId") ?? "") || null,
      trattativaId: null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "calendario.aggiungiEvento",
      messaggio: "Creazione evento non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/calendario");
  revalidatePath("/");
  return { errore: null, successo: true };
}

export async function rimuoviEvento(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaEvento(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "calendario.rimuoviEvento",
      messaggio: "Eliminazione evento non riuscita.",
      causa,
    });
  }

  revalidatePath("/calendario");
  revalidatePath("/");
}
