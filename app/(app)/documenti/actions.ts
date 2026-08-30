"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { DIMENSIONE_MASSIMA_BYTE, caricaAllegato, eliminaAllegato } from "@/lib/data/allegati";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

const MB = Math.round(DIMENSIONE_MASSIMA_BYTE / 1024 / 1024);

export async function caricaDocumento(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ...statoVuoto, errore: "Scegli un file da caricare." };
  }
  // Il controllo vero sta nel bucket, che rifiuta comunque: questo serve solo a
  // dirlo subito invece di far attendere un caricamento destinato a fallire.
  if (file.size > DIMENSIONE_MASSIMA_BYTE) {
    return { ...statoVuoto, errore: `Il file supera i ${MB} MB. Comprimilo o riducine la risoluzione.` };
  }

  try {
    await caricaAllegato(supabase, user.id, {
      file,
      descrizione: String(formData.get("descrizione") ?? "").trim() || null,
      fatturaId: String(formData.get("fatturaId") ?? "") || null,
      spesaId: String(formData.get("spesaId") ?? "") || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "documenti.caricaDocumento",
      messaggio: "Caricamento allegato non riuscito.",
      causa,
    });
    return {
      ...statoVuoto,
      errore: "Caricamento non riuscito. Controlla che il formato sia ammesso (PDF, immagine, XML, CSV) e riprova.",
    };
  }

  revalidatePath("/documenti");
  revalidatePath("/fatture", "layout");
  return { errore: null, successo: true };
}

export async function rimuoviDocumento(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    await eliminaAllegato(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "documenti.rimuoviDocumento",
      messaggio: "Eliminazione allegato non riuscita.",
      causa,
    });
  }

  revalidatePath("/documenti");
  revalidatePath("/fatture", "layout");
}
