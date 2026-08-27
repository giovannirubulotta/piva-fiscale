"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { creaIncasso, aggiornaStatoIncasso, eliminaIncasso } from "@/lib/data/incassi";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiungiIncasso(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const cliente = String(formData.get("cliente") ?? "").trim();
  const dataEmissione = String(formData.get("data_emissione") ?? "");
  const importo = Number(formData.get("importo_netto"));

  if (!cliente) return { ...statoVuoto, errore: "Indica il cliente." };
  if (!dataEmissione) return { ...statoVuoto, errore: "Indica la data di emissione." };
  if (!Number.isFinite(importo) || importo <= 0) return { ...statoVuoto, errore: "L'importo deve essere positivo." };

  const giaIncassata = formData.get("gia_incassata") === "on";
  const dataIncasso = giaIncassata ? String(formData.get("data_incasso") ?? dataEmissione) : null;

  try {
    await creaIncasso(supabase, user.id, {
      numeroFattura: String(formData.get("numero_fattura") ?? "") || null,
      cliente,
      descrizione: String(formData.get("descrizione") ?? "") || null,
      dataEmissione,
      dataIncasso,
      importoNetto: importo,
      bolloApplicato: formData.get("bollo_applicato") === "on",
      stato: giaIncassata ? "incassata" : "da_incassare",
    });
  } catch {
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/", "layout");
  return { errore: null, successo: true };
}

export async function segnaIncassata(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  const data = String(formData.get("data_incasso") ?? new Date().toISOString().slice(0, 10));
  await aggiornaStatoIncasso(supabase, user.id, id, { stato: "incassata", dataIncasso: data });
  revalidatePath("/", "layout");
}

export async function annullaIncasso(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await aggiornaStatoIncasso(supabase, user.id, id, { stato: "annullata", dataIncasso: null });
  revalidatePath("/", "layout");
}

export async function rimuoviIncasso(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id"));
  await eliminaIncasso(supabase, user.id, id);
  revalidatePath("/", "layout");
}
