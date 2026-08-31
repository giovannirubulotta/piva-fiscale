"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { aggiornaNota, cambiaFissaggio, creaNota, eliminaNota } from "@/lib/data/note";
import { normalizzaEtichette } from "@/lib/domain/nota";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

function leggiCampi(formData: FormData) {
  return {
    titolo: String(formData.get("titolo") ?? "").trim() || null,
    testo: String(formData.get("testo") ?? "").trim(),
    clienteId: String(formData.get("clienteId") ?? "") || null,
    trattativaId: String(formData.get("trattativaId") ?? "") || null,
    etichette: normalizzaEtichette(String(formData.get("etichette") ?? "")),
  };
}

export async function aggiungiNota(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();
  const dati = leggiCampi(formData);

  if (!dati.testo) return { ...statoVuoto, errore: "Scrivi qualcosa." };

  try {
    await creaNota(supabase, user.id, dati);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "note.aggiungiNota",
      messaggio: "Creazione nota non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/note");
  revalidatePath("/crm");
  return { errore: null, successo: true };
}

export async function modificaNota(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const dati = leggiCampi(formData);

  if (!id) return { ...statoVuoto, errore: "Nota non trovata." };
  if (!dati.testo) return { ...statoVuoto, errore: "Il testo non può restare vuoto." };

  try {
    await aggiornaNota(supabase, user.id, id, dati);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "note.modificaNota",
      messaggio: "Modifica nota non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/note");
  revalidatePath("/crm");
  return { errore: null, successo: true };
}

export async function cambiaFissata(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const fissata = String(formData.get("fissata") ?? "") === "1";
  if (!id) return;

  try {
    await cambiaFissaggio(supabase, user.id, id, fissata);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "note.cambiaFissata",
      messaggio: "Fissaggio della nota non riuscito.",
      causa,
    });
  }

  revalidatePath("/note");
}

export async function rimuoviNota(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaNota(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "note.rimuoviNota",
      messaggio: "Eliminazione nota non riuscita.",
      causa,
    });
  }

  revalidatePath("/note");
  revalidatePath("/crm");
}
