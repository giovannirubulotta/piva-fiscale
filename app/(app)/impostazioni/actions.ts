"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { salvaProfilo } from "@/lib/data/profilo";
import { salvaAliquote } from "@/lib/data/aliquote";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiornaProfilo(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const coefficiente = Number(formData.get("coefficiente_redditivita"));
  if (!Number.isFinite(coefficiente) || coefficiente <= 0 || coefficiente > 100) {
    return { ...statoVuoto, errore: "Il coefficiente di redditività deve essere una percentuale tra 0 e 100." };
  }

  const agevolazioneRaw = String(formData.get("agevolazione_5_percento") ?? "da_verificare");
  const agevolazione5Percento = agevolazioneRaw === "si" ? true : agevolazioneRaw === "no" ? false : null;

  try {
    await salvaProfilo(supabase, user.id, {
      partitaIva: String(formData.get("partita_iva") ?? "") || null,
      codiceAteco: String(formData.get("codice_ateco") ?? "73.11.02"),
      coefficienteRedditivita: coefficiente / 100,
      dataApertura: String(formData.get("data_apertura") ?? "") || null,
      agevolazione5Percento,
    });
  } catch {
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}

export async function aggiornaAliquote(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase } = await richiediUtente();

  const anno = Number(formData.get("anno"));
  const standard = Number(formData.get("aliquota_sostitutiva_standard"));
  const agevolata = Number(formData.get("aliquota_sostitutiva_agevolata"));
  const inps = Number(formData.get("aliquota_inps"));
  const massimale = Number(formData.get("massimale_inps"));
  const minimale = Number(formData.get("minimale_inps"));

  if ([anno, standard, agevolata, inps, massimale, minimale].some((v) => !Number.isFinite(v))) {
    return { ...statoVuoto, errore: "Controlla che tutti i valori siano numeri validi." };
  }

  try {
    await salvaAliquote(supabase, {
      anno,
      aliquotaSostitutivaStandard: standard / 100,
      aliquotaSostitutivaAgevolata: agevolata / 100,
      aliquotaInps: inps / 100,
      massimaleInps: massimale,
      minimaleInps: minimale,
    });
  } catch {
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}
