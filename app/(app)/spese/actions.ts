"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { creaSpesa, eliminaSpesa } from "@/lib/data/spese";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiungiSpesa(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const descrizione = String(formData.get("descrizione") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const importo = Number(formData.get("importo"));

  if (!descrizione) return { ...statoVuoto, errore: "Indica una descrizione." };
  if (!data) return { ...statoVuoto, errore: "Indica la data." };
  if (!Number.isFinite(importo) || importo <= 0) return { ...statoVuoto, errore: "L'importo deve essere positivo." };

  try {
    await creaSpesa(supabase, user.id, {
      data,
      descrizione,
      categoria: String(formData.get("categoria") ?? "") || null,
      importo,
      // Facoltativo: una spesa occasionale non merita una scheda anagrafica.
      fornitoreId: String(formData.get("fornitoreId") ?? "") || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "spese.aggiungiSpesa",
      messaggio: "Registrazione spesa non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/spese");
  return { errore: null, successo: true };
}

export async function rimuoviSpesa(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await eliminaSpesa(supabase, user.id, id);
  revalidatePath("/spese");
}
