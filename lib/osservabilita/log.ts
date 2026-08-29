import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Logging strutturato degli errori applicativi.
 *
 * Esiste per una ragione precisa: prima di questo modulo dodici blocchi
 * `catch {}` ingoiavano l'errore reale e restituivano all'utente un generico
 * "Salvataggio non riuscito", rendendo impossibile capire *perché* qualcosa
 * fosse fallito senza riprodurre il bug. La soppressione silenziosa delle
 * eccezioni è vietata dallo standard di progetto, e a ragione: un errore non
 * registrato è un errore che si scopre solo quando qualcuno se ne lamenta.
 *
 * Il contratto è: all'utente un messaggio comprensibile, al log il dettaglio
 * tecnico. Le due cose non si mescolano mai.
 */

export type Severita = "errore" | "avviso" | "critico";

export interface EventoLog {
  /** Punto del codice, in forma `modulo.funzione` (es. "fatture.creaFattura"). */
  contesto: string;
  /** Cosa è andato storto, in una frase. */
  messaggio: string;
  severita?: Severita;
  /** L'errore originale, qualunque cosa sia stata lanciata. */
  causa?: unknown;
}

/** Estrae messaggio e stack da qualunque cosa venga lanciata: in JS non è detto sia un Error. */
function descrivi(causa: unknown): { dettaglio: string | null; stack: string | null } {
  if (causa instanceof Error) {
    return { dettaglio: `${causa.name}: ${causa.message}`, stack: causa.stack ?? null };
  }
  if (causa === undefined || causa === null) return { dettaglio: null, stack: null };
  if (typeof causa === "object") {
    try {
      return { dettaglio: JSON.stringify(causa), stack: null };
    } catch {
      return { dettaglio: String(causa), stack: null };
    }
  }
  return { dettaglio: String(causa), stack: null };
}

/**
 * Registra un evento. Non lancia mai: un fallimento del logging non deve
 * trasformarsi in un secondo errore che nasconde il primo — è il motivo per
 * cui questa è l'unica funzione del progetto autorizzata ad avere un catch
 * che non rilancia.
 *
 * Scrive sempre anche su console: sui log di Vercel resta traccia pure quando
 * il database è irraggiungibile, che è esattamente il caso in cui il log su
 * database non potrebbe funzionare.
 */
export async function registraErrore(
  supabase: SupabaseClient<Database> | null,
  userId: string | null,
  evento: EventoLog
): Promise<void> {
  const { dettaglio, stack } = descrivi(evento.causa);
  const severita = evento.severita ?? "errore";

  console.error(
    JSON.stringify({
      livello: severita,
      contesto: evento.contesto,
      messaggio: evento.messaggio,
      dettaglio,
      quando: new Date().toISOString(),
    })
  );

  if (!supabase || !userId) return;

  try {
    await supabase.from("fiscale_log_errori").insert({
      user_id: userId,
      severita,
      contesto: evento.contesto,
      messaggio: evento.messaggio,
      dettaglio,
      // Lo stack può essere lunghissimo e non aggiunge nulla oltre le prime
      // righe, che sono quelle del codice applicativo.
      stack: stack?.split("\n").slice(0, 12).join("\n") ?? null,
    });
  } catch (erroreDiLogging) {
    console.error("Logging su database non riuscito", erroreDiLogging);
  }
}

/**
 * Esegue un'operazione registrando l'errore reale e restituendo un messaggio
 * adatto all'utente. Sostituisce il pattern `try { … } catch { return
 * { errore: "…" } }` sparso nelle Server Actions, che perdeva la causa.
 */
export async function conLog<T>(
  supabase: SupabaseClient<Database>,
  userId: string,
  contesto: string,
  messaggioUtente: string,
  operazione: () => Promise<T>
): Promise<{ esito: "ok"; valore: T } | { esito: "errore"; messaggio: string }> {
  try {
    return { esito: "ok", valore: await operazione() };
  } catch (causa) {
    await registraErrore(supabase, userId, { contesto, messaggio: messaggioUtente, causa });
    return { esito: "errore", messaggio: messaggioUtente };
  }
}
