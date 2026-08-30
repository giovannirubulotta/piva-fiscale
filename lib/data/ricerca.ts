import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Ricerca trasversale: una casella sola che guarda dentro tutto.
 *
 * È il punto in cui un insieme di pagine diventa un software: finché per
 * ritrovare una fattura bisogna sapere che sta in "Fatture", l'utente deve
 * tenere a mente la struttura dell'applicazione invece del proprio lavoro. Qui
 * si scrive un pezzo di nome e si arriva dove serve.
 *
 * Le interrogazioni sono quattro in parallelo e non una vista unificata: le
 * tabelle hanno colonne diverse e una `union` in SQL costringerebbe a
 * uniformarle, cioè a inventare un formato comune che nessuna delle quattro
 * usa davvero. Quattro `select` mirate costano un round-trip in più e restano
 * leggibili.
 */

export type TipoRisultato = "cliente" | "fattura" | "documento" | "spesa";

export interface RisultatoRicerca {
  tipo: TipoRisultato;
  id: string;
  titolo: string;
  sottotitolo: string;
  href: string;
}

export const ETICHETTE_TIPO: Record<TipoRisultato, string> = {
  cliente: "Cliente",
  fattura: "Documento",
  documento: "Archivio",
  spesa: "Spesa",
};

/**
 * `%` e `_` sono jolly in `like`, e la virgola separa le condizioni dentro
 * `or()`: lasciarle passare significa che chi cerca "50% acconto, saldo"
 * ottiene una query diversa da quella che ha scritto — nel caso migliore zero
 * risultati, nel peggiore una condizione malformata. Si neutralizzano qui,
 * una volta, invece che in ognuna delle quattro interrogazioni.
 */
export function ripuliscTermine(termine: string): string {
  return termine.trim().replace(/[%_,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

/** Sotto i due caratteri ogni ricerca restituisce mezzo archivio: non è un risultato, è rumore. */
export const LUNGHEZZA_MINIMA = 2;

export async function cerca(
  supabase: SupabaseClient<Database>,
  userId: string,
  termine: string,
  limitePerTipo = 5
): Promise<RisultatoRicerca[]> {
  const pulito = ripuliscTermine(termine);
  if (pulito.length < LUNGHEZZA_MINIMA) return [];

  const schema = `%${pulito}%`;

  const [clienti, fatture, documenti, spese] = await Promise.all([
    supabase
      .from("fiscale_clienti")
      .select("id, denominazione, nome, cognome, partita_iva, codice_fiscale, comune")
      .eq("user_id", userId)
      .or(
        [
          `denominazione.ilike.${schema}`,
          `nome.ilike.${schema}`,
          `cognome.ilike.${schema}`,
          `partita_iva.ilike.${schema}`,
          `codice_fiscale.ilike.${schema}`,
        ].join(",")
      )
      .limit(limitePerTipo),

    supabase
      .from("fiscale_fatture")
      .select("id, progressivo, anno, tipo_documento, data_emissione, stato, note")
      .eq("user_id", userId)
      .or([`note.ilike.${schema}`, numeroCome(pulito)].filter(Boolean).join(","))
      .limit(limitePerTipo),

    supabase
      .from("fiscale_allegati")
      .select("id, nome_file, descrizione, caricato_il")
      .eq("user_id", userId)
      .or([`nome_file.ilike.${schema}`, `descrizione.ilike.${schema}`].join(","))
      .limit(limitePerTipo),

    supabase
      .from("fiscale_spese")
      .select("id, descrizione, categoria, data, importo")
      .eq("user_id", userId)
      .or([`descrizione.ilike.${schema}`, `categoria.ilike.${schema}`].join(","))
      .limit(limitePerTipo),
  ]);

  // Un errore su una delle quattro non deve svuotare le altre tre: chi cerca
  // preferisce tre risultati su quattro a una pagina vuota senza spiegazione.
  const risultati: RisultatoRicerca[] = [];

  for (const c of clienti.data ?? []) {
    const nome = c.denominazione || [c.nome, c.cognome].filter(Boolean).join(" ") || "Senza nome";
    risultati.push({
      tipo: "cliente",
      id: c.id,
      titolo: nome,
      sottotitolo: [c.partita_iva || c.codice_fiscale, c.comune].filter(Boolean).join(" · "),
      href: `/clienti/${c.id}`,
    });
  }

  for (const f of fatture.data ?? []) {
    risultati.push({
      tipo: "fattura",
      id: f.id,
      titolo: `${f.tipo_documento === "TD04" ? "Nota di credito" : "Fattura"} ${f.progressivo}/${f.anno}`,
      sottotitolo: [f.data_emissione, f.stato].filter(Boolean).join(" · "),
      href: `/fatture/${f.id}`,
    });
  }

  for (const d of documenti.data ?? []) {
    risultati.push({
      tipo: "documento",
      id: d.id,
      titolo: d.nome_file,
      sottotitolo: d.descrizione ?? d.caricato_il.slice(0, 10),
      href: "/documenti",
    });
  }

  for (const s of spese.data ?? []) {
    risultati.push({
      tipo: "spesa",
      id: s.id,
      titolo: s.descrizione,
      sottotitolo: [s.data, s.categoria].filter(Boolean).join(" · "),
      href: "/spese",
    });
  }

  return risultati;
}

/**
 * "12/2026" o "12" cercano un numero di fattura, non un testo nelle note.
 * Restituisce una condizione PostgREST sul progressivo, o stringa vuota se il
 * termine non somiglia a un numero — in quel caso non ha senso interrogare una
 * colonna intera con un `ilike`, che finirebbe in un cast e in un errore.
 */
function numeroCome(termine: string): string {
  const soloNumero = termine.split("/")[0].trim();
  return /^\d{1,6}$/.test(soloNumero) ? `progressivo.eq.${Number(soloNumero)}` : "";
}
