import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";

/**
 * Anagrafica dei fornitori.
 *
 * Finora una spesa aveva solo una descrizione libera: "Aruba", "aruba.it" e
 * "Rinnovo hosting Aruba" erano tre stringhe diverse, e "quanto spendo per
 * questo fornitore" era una domanda senza risposta. Il collegamento è
 * facoltativo — una spesa da un negozio in cui non tornerai non merita una
 * scheda anagrafica — ma quando c'è rende sommabile ciò che prima non lo era.
 *
 * Come per il listino, i fornitori si **disattivano**: le spese già registrate
 * continuano a puntare alla scheda, e un elenco storico con dei buchi è peggio
 * di un elenco lungo.
 */

export interface Fornitore {
  id: string;
  denominazione: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  email: string | null;
  telefono: string | null;
  categoriaPredefinita: string | null;
  note: string | null;
  attivo: boolean;
}

function mappa(riga: Tables<"fiscale_fornitori">): Fornitore {
  return {
    id: riga.id,
    denominazione: riga.denominazione,
    partitaIva: riga.partita_iva,
    codiceFiscale: riga.codice_fiscale,
    email: riga.email,
    telefono: riga.telefono,
    categoriaPredefinita: riga.categoria_predefinita,
    note: riga.note,
    attivo: riga.attivo,
  };
}

export async function leggiFornitori(
  supabase: SupabaseClient<Database>,
  userId: string,
  soloAttivi = false
): Promise<Fornitore[]> {
  let query = supabase.from("fiscale_fornitori").select("*").eq("user_id", userId);
  if (soloAttivi) query = query.eq("attivo", true);

  const { data, error } = await query.order("denominazione", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mappa);
}

export interface NuovoFornitore {
  denominazione: string;
  partitaIva: string | null;
  codiceFiscale: string | null;
  email: string | null;
  telefono: string | null;
  categoriaPredefinita: string | null;
  note: string | null;
}

export async function creaFornitore(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovoFornitore
): Promise<void> {
  const { error } = await supabase.from("fiscale_fornitori").insert({
    user_id: userId,
    denominazione: dati.denominazione,
    partita_iva: dati.partitaIva,
    codice_fiscale: dati.codiceFiscale,
    email: dati.email,
    telefono: dati.telefono,
    categoria_predefinita: dati.categoriaPredefinita,
    note: dati.note,
  });
  if (error) throw error;
}

export async function cambiaAttivazioneFornitore(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string,
  attivo: boolean
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_fornitori")
    .update({ attivo })
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw error;
}

export async function eliminaFornitore(
  supabase: SupabaseClient<Database>,
  userId: string,
  id: string
): Promise<void> {
  // Le spese collegate hanno `on delete set null`: restano, e tornano a essere
  // spese senza fornitore. Cancellare la scheda non deve cancellare la storia
  // contabile che ci si appoggia.
  const { error } = await supabase.from("fiscale_fornitori").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}
