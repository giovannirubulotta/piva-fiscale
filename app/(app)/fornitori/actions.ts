"use server";

import { revalidatePath } from "next/cache";
import { richiediUtente } from "@/lib/auth";
import { registraErrore } from "@/lib/osservabilita/log";
import { cambiaAttivazioneFornitore, creaFornitore, eliminaFornitore } from "@/lib/data/fornitori";

export interface EsitoForm {
  errore: string | null;
  successo: boolean;
}

const statoVuoto: EsitoForm = { errore: null, successo: false };

export async function aggiungiFornitore(_prev: EsitoForm, formData: FormData): Promise<EsitoForm> {
  const { supabase, user } = await richiediUtente();

  const denominazione = String(formData.get("denominazione") ?? "").trim();
  if (!denominazione) return { ...statoVuoto, errore: "Indica il nome del fornitore." };

  try {
    await creaFornitore(supabase, user.id, {
      denominazione,
      partitaIva: String(formData.get("partitaIva") ?? "").trim() || null,
      codiceFiscale: String(formData.get("codiceFiscale") ?? "").trim() || null,
      email: String(formData.get("email") ?? "").trim() || null,
      telefono: String(formData.get("telefono") ?? "").trim() || null,
      categoriaPredefinita: String(formData.get("categoriaPredefinita") ?? "").trim() || null,
      note: String(formData.get("note") ?? "").trim() || null,
    });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "fornitori.aggiungiFornitore",
      messaggio: "Creazione fornitore non riuscita.",
      causa,
    });
    return { ...statoVuoto, errore: "Salvataggio non riuscito. Riprova." };
  }

  revalidatePath("/fornitori");
  revalidatePath("/spese");
  return { errore: null, successo: true };
}

export async function cambiaAttivazione(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  const attivo = String(formData.get("attivo") ?? "") === "1";
  if (!id) return;

  try {
    await cambiaAttivazioneFornitore(supabase, user.id, id, attivo);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "fornitori.cambiaAttivazione",
      messaggio: "Cambio di stato del fornitore non riuscito.",
      causa,
    });
  }

  revalidatePath("/fornitori");
  revalidatePath("/spese");
}

export async function rimuoviFornitore(formData: FormData): Promise<void> {
  const { supabase, user } = await richiediUtente();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  try {
    // Le spese collegate hanno `on delete set null`: restano, e tornano a
    // essere spese senza fornitore. Cancellare la scheda non cancella la
    // storia contabile che ci si appoggia.
    await eliminaFornitore(supabase, user.id, id);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "fornitori.rimuoviFornitore",
      messaggio: "Eliminazione fornitore non riuscita.",
      causa,
    });
  }

  revalidatePath("/fornitori");
  revalidatePath("/spese");
}
