"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { salvaRequisitiForfettario } from "@/lib/data/requisitiForfettario";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

function leggiBooleanoTristato(formData: FormData, campo: string): boolean | null {
  const raw = String(formData.get(campo) ?? "da_verificare");
  return raw === "si" ? true : raw === "no" ? false : null;
}

export async function aggiornaRequisiti(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const anno = Number(formData.get("anno"));
  if (!Number.isFinite(anno)) {
    return { ...statoVuoto, errore: "Anno non valido." };
  }

  try {
    await salvaRequisitiForfettario(supabase, user.id, {
      anno,
      redditoLavoroDipendenteOltreSoglia: leggiBooleanoTristato(formData, "reddito_lavoro_dipendente"),
      partecipazioniSocietaRiconducibili: leggiBooleanoTristato(formData, "partecipazioni_societa"),
      committentePrevalenteExDatore: leggiBooleanoTristato(formData, "committente_prevalente_ex_datore"),
      residenzaFuoriUeSee: leggiBooleanoTristato(formData, "residenza_fuori_ue"),
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "requisiti.salvaRequisiti",
      messaggio: "Salvataggio autovalutazione requisiti non riuscito.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}
