"use server";

import { richiediUtente } from "@/lib/auth";
import { cerca, type RisultatoRicerca } from "@/lib/data/ricerca";
import { registraErrore } from "@/lib/osservabilita/log";

/**
 * La ricerca gira sul server: le query hanno le policy RLS attive e nessun
 * indice di dati fiscali viene mai spedito al browser "per velocizzare".
 */
export async function cercaOvunque(termine: string): Promise<RisultatoRicerca[]> {
  const { supabase, user } = await richiediUtente();
  try {
    return await cerca(supabase, user.id, termine);
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "ricerca.cercaOvunque",
      messaggio: "Ricerca trasversale non riuscita.",
      causa,
    });
    return [];
  }
}
