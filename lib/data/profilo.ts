import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { DatiEmittente, ProfiloFiscale } from "@/lib/domain/types";
import { mappaDatiEmittente, mappaProfilo } from "./mappers";

export interface ProfiloCompleto extends ProfiloFiscale {
  partitaIva: string | null;
  codiceAteco: string;
}

export async function leggiProfilo(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProfiloCompleto | null> {
  const { data, error } = await supabase.from("fiscale_profilo").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...mappaProfilo(data),
    partitaIva: data.partita_iva,
    codiceAteco: data.codice_ateco,
  };
}

/** I soli dati anagrafici che servono al blocco CedentePrestatore dell'XML. */
export async function leggiDatiEmittente(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DatiEmittente | null> {
  const { data, error } = await supabase.from("fiscale_profilo").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? mappaDatiEmittente(data) : null;
}

export interface DatiProfiloModificabili {
  partitaIva: string | null;
  codiceAteco: string;
  coefficienteRedditivita: number;
  dataApertura: string | null;
  agevolazione5Percento: boolean | null;
  note?: string | null;
}

export async function salvaProfilo(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: DatiProfiloModificabili
): Promise<void> {
  const { error } = await supabase.from("fiscale_profilo").upsert({
    user_id: userId,
    partita_iva: dati.partitaIva,
    codice_ateco: dati.codiceAteco,
    coefficiente_redditivita: dati.coefficienteRedditivita,
    data_apertura: dati.dataApertura,
    agevolazione_5_percento: dati.agevolazione5Percento,
    note: dati.note ?? null,
  });
  if (error) throw error;
}

/**
 * Anagrafica dell'emittente, separata dai parametri di calcolo: si compila una
 * volta e serve solo alla fatturazione. Tenerla in un'azione distinta evita che
 * salvare un indirizzo tocchi il coefficiente di redditività.
 */
export type DatiEmittenteModificabili = Omit<DatiEmittente, "partitaIva">;

export async function salvaDatiEmittente(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: DatiEmittenteModificabili
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_profilo")
    .update({
      codice_fiscale: dati.codiceFiscale,
      nome: dati.nome,
      cognome: dati.cognome,
      indirizzo: dati.indirizzo,
      numero_civico: dati.numeroCivico,
      cap: dati.cap,
      comune: dati.comune,
      provincia: dati.provincia,
      nazione: dati.nazione,
      email: dati.email,
      telefono: dati.telefono,
      iban: dati.iban,
      bollo_riaddebitato: dati.bolloRiaddebitato,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (error) throw error;
}
