"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { cambiaAttivazioneVoce, creaVoceListino, eliminaVoceListino } from "@/lib/data/listino";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiungiVoce(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const descrizione = String(formData.get("descrizione") ?? "").trim();
  const prezzo = Number(formData.get("prezzoUnitario"));

  if (!descrizione) return { ...statoVuoto, errore: "Indica la descrizione della prestazione." };
  if (!Number.isFinite(prezzo) || prezzo < 0) return { ...statoVuoto, errore: "Il prezzo non può essere negativo." };

  try {
    await creaVoceListino(supabase, user.id, {
      descrizione,
      prezzoUnitario: prezzo,
      unitaMisura: String(formData.get("unitaMisura") ?? "").trim() || null,
      categoria: String(formData.get("categoria") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "listino.aggiungiVoce",
      messaggio: "Creazione voce di listino non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/listino");
  return { errore: null, successo: true };
}

export async function attivaDisattivaVoce(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await cambiaAttivazioneVoce(supabase, user.id, id, String(formData.get("attivo")) === "true");
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "listino.attivaDisattivaVoce",
      messaggio: "Cambio di stato della voce non riuscito.",
      causa,
    });
  }

  revalidatePath("/listino");
}

export async function rimuoviVoce(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaVoceListino(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "listino.rimuoviVoce",
      messaggio: "Eliminazione voce di listino non riuscita.",
      causa,
    });
  }

  revalidatePath("/listino");
}
