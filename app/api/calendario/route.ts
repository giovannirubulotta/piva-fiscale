import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leggiEventi } from "@/lib/data/eventi";
import { leggiFatture, leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiPreventivi } from "@/lib/data/preventivi";
import { leggiRicorrenti } from "@/lib/data/ricorrenti";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiAttivita } from "@/lib/data/crm";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { nomeCliente } from "@/lib/domain/cliente";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali } from "@/lib/domain/scadenzario";
import { generaIcs, vociCalendario } from "@/lib/domain/calendario";

/**
 * Il calendario in formato iCalendar, da importare in Google Calendar, Apple
 * Calendario o Outlook.
 *
 * È uno **scaricamento autenticato**, non un indirizzo di sottoscrizione. La
 * differenza conta: un calendario a cui Google si abbona da solo ha bisogno di
 * un indirizzo che Google possa aprire senza cookie, cioè di un segreto
 * nell'URL — e chiunque venga in possesso di quell'indirizzo legge l'agenda,
 * i nomi dei clienti e gli importi. È una scelta legittima ma è una scelta, e
 * non si prende di nascosto per conto di chi userà il software: il file
 * scaricato si importa e resta una fotografia, l'abbonamento vivo si aggiunge
 * quando lo si vuole davvero, sapendo cosa comporta.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  const [eventi, fatture, preventivi, ricorrenti, clienti, attivita, profilo, aliquote, incassi, statiScadenze] =
    await Promise.all([
      leggiEventi(supabase, user.id),
      leggiFatture(supabase, user.id),
      leggiPreventivi(supabase, user.id),
      leggiRicorrenti(supabase, user.id),
      leggiClienti(supabase, user.id),
      leggiAttivita(supabase, user.id),
      leggiProfilo(supabase, user.id),
      leggiAliquote(supabase),
      leggiIncassiDaFatture(supabase, user.id),
      leggiStatiScadenze(supabase, user.id),
    ]);

  const adesso = new Date();
  const oggi = adesso.toISOString().slice(0, 10);
  const scadenzeFiscali = profilo
    ? generaScadenzeAnnuali(riepiloghiAnniChiusi(incassi, profilo, aliquote, Number(oggi.slice(0, 4))))
    : [];

  const voci = vociCalendario(
    {
      eventi,
      scadenzeFiscali,
      scadenzePagate: new Set(
        [...statiScadenze.entries()].filter(([, stato]) => stato.pagato).map(([chiave]) => chiave)
      ),
      fatture,
      preventivi,
      ricorrenti,
      attivita,
      nomiClienti: new Map(clienti.map((c) => [c.id, nomeCliente(c)])),
    },
    oggi
  );

  return new NextResponse(generaIcs(voci, "GAR Studio", adesso), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="gar-studio-${oggi}.ics"`,
      // Nomi di clienti e importi: non deve restare in nessuna cache lungo
      // il percorso.
      "Cache-Control": "no-store, private",
    },
  });
}
