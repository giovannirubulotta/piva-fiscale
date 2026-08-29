"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import {
  creaCredito,
  eliminaCredito,
  segnaCreditoNonUtilizzato,
  segnaCreditoUtilizzato,
} from "@/lib/data/creditiDisponibili";
import type { TipologiaCredito } from "@/lib/domain/types";

const TIPOLOGIE_VALIDE: readonly TipologiaCredito[] = ["irpef", "imposta_sostitutiva", "inps", "irap", "altro"];

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiungiCredito(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const tipologia = String(formData.get("tipologia") ?? "");
  const annoMaturazione = Number(formData.get("annoMaturazione"));
  const importo = Number(formData.get("importo"));

  if (!TIPOLOGIE_VALIDE.includes(tipologia as TipologiaCredito)) {
    return { ...statoVuoto, errore: "Seleziona una tipologia valida." };
  }
  if (!Number.isInteger(annoMaturazione) || annoMaturazione < 2000) {
    return { ...statoVuoto, errore: "Indica l'anno di maturazione." };
  }
  if (!Number.isFinite(importo) || importo <= 0) {
    return { ...statoVuoto, errore: "L'importo deve essere positivo." };
  }

  try {
    await creaCredito(supabase, user.id, {
      tipologia: tipologia as TipologiaCredito,
      annoMaturazione,
      importo,
      note: String(formData.get("note") ?? "") || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "f24.aggiungiCredito",
      messaggio: "Registrazione credito non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/f24");
  return { errore: null, successo: true };
}

export async function utilizzaCredito(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  const annoUtilizzo = Number(formData.get("annoUtilizzo"));
  if (!Number.isInteger(annoUtilizzo)) return;
  await segnaCreditoUtilizzato(supabase, user.id, id, annoUtilizzo);
  revalidatePath("/f24");
}

export async function annullaUtilizzoCredito(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await segnaCreditoNonUtilizzato(supabase, user.id, id);
  revalidatePath("/f24");
}

export async function rimuoviCredito(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await eliminaCredito(supabase, user.id, id);
  revalidatePath("/f24");
}
