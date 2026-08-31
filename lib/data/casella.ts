import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "@/lib/supabase/database.types";
import { cifra, decifra } from "@/lib/domain/cifratura";

/**
 * La casella di posta configurata.
 *
 * Le password **non escono mai da questo modulo in chiaro** se non attraverso
 * `credenziali()`, che è l'unica funzione che decifra ed è chiamata solo dal
 * codice che deve davvero collegarsi. `leggiCasella()` restituisce la
 * configurazione senza segreti: è quella che va alle pagine, e così una
 * password non può finire in un componente per distrazione.
 */

/** La configurazione senza segreti: quella che può attraversare l'applicazione. */
export interface Casella {
  id: string;
  indirizzo: string;
  nomeMittente: string | null;
  imapHost: string;
  imapPorta: number;
  imapUtente: string;
  smtpHost: string;
  smtpPorta: number;
  smtpUtente: string;
  ultimaVerifica: string | null;
  ultimoErrore: string | null;
}

function mappa(riga: Tables<"fiscale_caselle">): Casella {
  return {
    id: riga.id,
    indirizzo: riga.indirizzo,
    nomeMittente: riga.nome_mittente,
    imapHost: riga.imap_host,
    imapPorta: riga.imap_porta,
    imapUtente: riga.imap_utente,
    smtpHost: riga.smtp_host,
    smtpPorta: riga.smtp_porta,
    smtpUtente: riga.smtp_utente,
    ultimaVerifica: riga.ultima_verifica,
    ultimoErrore: riga.ultimo_errore,
  };
}

export async function leggiCasella(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Casella | null> {
  const { data, error } = await supabase
    .from("fiscale_caselle")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mappa(data) : null;
}

export interface CredenzialiImap {
  host: string;
  porta: number;
  utente: string;
  password: string;
}

export interface CredenzialiComplete {
  indirizzo: string;
  nomeMittente: string | null;
  imap: CredenzialiImap;
  smtp: CredenzialiImap;
}

/**
 * Le credenziali in chiaro, per chi deve collegarsi davvero.
 *
 * Da chiamare solo dentro codice che gira sul server e che apre subito la
 * connessione. Il valore restituito non va mai messo in uno stato, in un log,
 * in una risposta HTTP o passato a un componente.
 */
export async function credenziali(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CredenzialiComplete | null> {
  const { data, error } = await supabase
    .from("fiscale_caselle")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    indirizzo: data.indirizzo,
    nomeMittente: data.nome_mittente,
    imap: {
      host: data.imap_host,
      porta: data.imap_porta,
      utente: data.imap_utente,
      password: decifra(data.imap_password_cifrata),
    },
    smtp: {
      host: data.smtp_host,
      porta: data.smtp_porta,
      utente: data.smtp_utente,
      password: decifra(data.smtp_password_cifrata),
    },
  };
}

export interface NuovaCasella {
  indirizzo: string;
  nomeMittente: string | null;
  imapHost: string;
  imapPorta: number;
  imapUtente: string;
  imapPassword: string;
  smtpHost: string;
  smtpPorta: number;
  smtpUtente: string;
  smtpPassword: string;
}

/**
 * Salva la configurazione. Una sola casella per utente: `upsert` sulla chiave
 * unica, così riconfigurare non lascia dietro una riga orfana.
 */
export async function salvaCasella(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: NuovaCasella
): Promise<void> {
  const { error } = await supabase.from("fiscale_caselle").upsert(
    {
      user_id: userId,
      indirizzo: dati.indirizzo,
      nome_mittente: dati.nomeMittente,
      imap_host: dati.imapHost,
      imap_porta: dati.imapPorta,
      imap_utente: dati.imapUtente,
      imap_password_cifrata: cifra(dati.imapPassword),
      smtp_host: dati.smtpHost,
      smtp_porta: dati.smtpPorta,
      smtp_utente: dati.smtpUtente,
      smtp_password_cifrata: cifra(dati.smtpPassword),
      updated_at: new Date().toISOString(),
      // Riconfigurando, l'esito della verifica precedente non vale più.
      ultima_verifica: null,
      ultimo_errore: null,
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

/** Registra com'è andato l'ultimo tentativo di collegamento. */
export async function registraVerifica(
  supabase: SupabaseClient<Database>,
  userId: string,
  errore: string | null
): Promise<void> {
  const { error } = await supabase
    .from("fiscale_caselle")
    .update({ ultima_verifica: new Date().toISOString(), ultimo_errore: errore })
    .eq("user_id", userId);
  if (error) throw error;
}

export async function eliminaCasella(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await supabase.from("fiscale_caselle").delete().eq("user_id", userId);
  if (error) throw error;
}

export interface Invio {
  id: string;
  destinatario: string;
  oggetto: string;
  clienteId: string | null;
  fatturaId: string | null;
  preventivoId: string | null;
  conAllegato: boolean;
  inviatoIl: string;
}

export async function leggiInvii(
  supabase: SupabaseClient<Database>,
  userId: string,
  limite = 50
): Promise<Invio[]> {
  const { data, error } = await supabase
    .from("fiscale_invii")
    .select("*")
    .eq("user_id", userId)
    .order("inviato_il", { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    destinatario: r.destinatario,
    oggetto: r.oggetto,
    clienteId: r.cliente_id,
    fatturaId: r.fattura_id,
    preventivoId: r.preventivo_id,
    conAllegato: r.con_allegato,
    inviatoIl: r.inviato_il,
  }));
}

export async function registraInvio(
  supabase: SupabaseClient<Database>,
  userId: string,
  dati: {
    destinatario: string;
    oggetto: string;
    clienteId: string | null;
    fatturaId: string | null;
    preventivoId: string | null;
    conAllegato: boolean;
  }
): Promise<void> {
  const { error } = await supabase.from("fiscale_invii").insert({
    user_id: userId,
    destinatario: dati.destinatario,
    oggetto: dati.oggetto,
    cliente_id: dati.clienteId,
    fattura_id: dati.fatturaId,
    preventivo_id: dati.preventivoId,
    con_allegato: dati.conAllegato,
  });
  if (error) throw error;
}
