import { NextResponse } from "next/server";
import { richiediUtente } from "@/lib/auth";
import { leggiAllegato, urlFirmato } from "@/lib/data/allegati";
import { registraErrore } from "@/lib/osservabilita/log";

/**
 * Scarica un allegato.
 *
 * Il file non passa da qui: si genera un link firmato a scadenza breve e si
 * reindirizza. Far transitare i byte attraverso il server significherebbe
 * pagarli due volte in banda e in tempo di funzione, senza guadagnare nulla in
 * sicurezza — il controllo di proprietà avviene comunque prima, leggendo la
 * riga con le policy RLS attive.
 *
 * `no-store` sulla risposta: è un reindirizzamento verso un URL che scade, e
 * una cache lo servirebbe scaduto.
 */
export async function GET(_richiesta: Request, contesto: { params: Promise<{ id: string }> }) {
  const { id } = await contesto.params;
  const { supabase, user } = await richiediUtente();

  const allegato = await leggiAllegato(supabase, user.id, id);
  if (!allegato) {
    return NextResponse.json({ errore: "Allegato non trovato." }, { status: 404 });
  }

  try {
    const url = await urlFirmato(supabase, allegato);
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (causa) {
    await registraErrore(supabase, user.id, {
      contesto: "api.allegati.GET",
      messaggio: "Generazione del link firmato non riuscita.",
      causa,
    });
    return NextResponse.json({ errore: "Non è stato possibile preparare il download." }, { status: 502 });
  }
}
