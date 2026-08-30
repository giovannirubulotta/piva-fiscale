import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiPreventivi } from "@/lib/data/preventivi";
import { leggiClienti } from "@/lib/data/clienti";
import { nomeCliente } from "@/lib/domain/cliente";
import {
  ETICHETTE_STATO,
  giorniDiValidita,
  numeroPreventivo,
  riepilogoPreventivi,
  statoEffettivo,
  totalePreventivo,
  type StatoEffettivo,
} from "@/lib/domain/preventivo";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Metrica, Scheda, Vuoto } from "@/components/Pagina";

const COLORE_STATO: Record<StatoEffettivo, string> = {
  bozza: "text-ink-muted",
  inviato: "text-accent",
  accettato: "text-ok",
  rifiutato: "text-ink-faint",
  scaduto: "text-warn",
};

export default async function PaginaPreventivi() {
  const { supabase, user } = await richiediUtente();

  const [preventivi, clienti] = await Promise.all([
    leggiPreventivi(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);

  const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const oggi = new Date().toISOString().slice(0, 10);
  const riepilogo = riepilogoPreventivi(preventivi, oggi);

  return (
    <div className="flex flex-col gap-8">
      <IntestazionePagina
        titolo="Preventivi"
        descrizione="Le offerte prima che diventino fatture. Un preventivo accettato si trasforma in fattura con un clic, e le righe vengono copiate: da lì i due documenti hanno vite separate."
        azioni={
          <Link href="/preventivi/nuovo" className="btn-primario">
            Nuovo preventivo
          </Link>
        }
      />

      {preventivi.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metrica
            etichetta="In attesa di risposta"
            valore={formattaEuro(riepilogo.valoreInAttesa)}
            nota={`${riepilogo.inviati} ${riepilogo.inviati === 1 ? "preventivo" : "preventivi"}`}
            accento
          />
          <Metrica
            etichetta="Accettati"
            valore={formattaEuro(riepilogo.valoreAccettato)}
            nota={`${riepilogo.accettati} su ${riepilogo.accettati + riepilogo.rifiutati + riepilogo.scaduti + riepilogo.inviati}`}
          />
          <Metrica
            etichetta="Tasso di accettazione"
            valore={riepilogo.tassoAccettazione === null ? "—" : `${riepilogo.tassoAccettazione}%`}
            nota={riepilogo.tassoAccettazione === null ? "nessuna risposta ancora" : "su chi ha risposto"}
          />
          <Metrica
            etichetta="Scaduti senza risposta"
            valore={String(riepilogo.scaduti)}
            nota="silenzi, non rifiuti"
            stato={riepilogo.scaduti > 0 ? "warn" : undefined}
          />
        </div>
      )}

      <Scheda>
        {preventivi.length === 0 ? (
          <Vuoto
            messaggio="Nessun preventivo. Il primo passo prima di una fattura."
            azione={{ href: "/preventivi/nuovo", testo: "Crea un preventivo" }}
          />
        ) : (
          <ul className="divide-y divide-line">
            {preventivi.map((p) => {
              const stato = statoEffettivo(p, oggi);
              const giorni = giorniDiValidita(p, oggi);
              return (
                <li key={p.id} className="riga-interattiva">
                  <Link
                    href={`/preventivi/${p.id}`}
                    className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium">{numeroPreventivo(p)}</span>
                        <span className="text-ink-muted">{nomi.get(p.clienteId) ?? "—"}</span>
                      </div>
                      <div className="text-xs text-ink-faint mt-0.5">
                        {p.oggetto ? `${p.oggetto} · ` : ""}
                        {formattaData(p.dataEmissione)}
                        {stato === "inviato" &&
                          ` · ${giorni === 0 ? "scade oggi" : `ancora ${giorni} ${giorni === 1 ? "giorno" : "giorni"}`}`}
                      </div>
                    </div>
                    <span className={`text-xs shrink-0 ${COLORE_STATO[stato]}`}>{ETICHETTE_STATO[stato]}</span>
                    <span className="tabular-nums shrink-0">{formattaEuro(totalePreventivo(p))}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Scheda>
    </div>
  );
}
