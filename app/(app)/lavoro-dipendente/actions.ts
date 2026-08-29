"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { creaLavoroDipendente, eliminaLavoroDipendente } from "@/lib/data/lavoroDipendente";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

function numeroONullo(valore: FormDataEntryValue | null): number {
  const n = Number(valore);
  return Number.isFinite(n) ? n : 0;
}

export async function aggiungiLavoroDipendente(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const anno = Number(formData.get("anno"));
  const redditoImponibile = Number(formData.get("redditoImponibile"));

  if (!Number.isInteger(anno) || anno < 2000) return { ...statoVuoto, errore: "Indica l'anno." };
  if (!Number.isFinite(redditoImponibile) || redditoImponibile < 0) {
    return { ...statoVuoto, errore: "Il reddito imponibile non può essere negativo." };
  }

  try {
    await creaLavoroDipendente(supabase, user.id, {
      anno,
      datoreLavoro: String(formData.get("datoreLavoro") ?? "") || null,
      redditoImponibile,
      ritenuteIrpef: numeroONullo(formData.get("ritenuteIrpef")),
      addizionaleRegionale: numeroONullo(formData.get("addizionaleRegionale")),
      addizionaleComunale: numeroONullo(formData.get("addizionaleComunale")),
      note: String(formData.get("note") ?? "") || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "lavoroDipendente.aggiungiLavoroDipendente",
      messaggio: "Registrazione dati CU non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/lavoro-dipendente");
  return { errore: null, successo: true };
}

export async function rimuoviLavoroDipendente(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await eliminaLavoroDipendente(supabase, user.id, id);
  revalidatePath("/lavoro-dipendente");
}
