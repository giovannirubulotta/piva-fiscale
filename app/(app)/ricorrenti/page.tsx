import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiRicorrenti } from "@/lib/data/ricorrenti";
import { leggiClienti } from "@/lib/data/clienti";
import { nomeCliente } from "@/lib/domain/cliente";
import {
  ETICHETTE_CADENZA,
  occorrenzeDaEmettere,
  prossimaOccorrenza,
  riepilogoRicorrenti,
  totaleRicorrente,
  valoreAnnuo,
} from "@/lib/domain/ricorrenza";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import { IntestazionePagina, Metrica, Pillola, Scheda, Vuoto } from "@/components/Pagina";
import { emettiProssima } from "./actions";

export const metadata = { title: "Ricorrenti — GAR Studio" };

export default async function PaginaRicorrenti() {
  const { supabase, user } = await richiediUtente();
  const [ricorrenti, clienti] = await Promise.all([
    leggiRicorrenti(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);

  const oggi = new Date().toISOString().slice(0, 10);
  const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const riepilogo = riepilogoRicorrenti(ricorrenti, oggi);

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Canoni ricorrenti"
        descrizione="Le prestazioni che si ripetono. La serie tiene il conto delle scadenze; la fattura la emetti tu, quando l'hai riletta."
        azioni={
          <Link href="/ricorrenti/nuovo" className="btn-primario">
            Nuova serie
          </Link>
        }
      />

      {ricorrenti.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Metrica
            etichetta="Valore annuo attivo"
            valore={formattaEuro(riepilogo.valoreAnnuoAttivo)}
            accento
            nota={
              riepilogo.attive === 1 ? "1 serie attiva" : `${riepilogo.attive} serie attive`
            }
          />
          <Metrica
            etichetta="Da emettere"
            valore={String(riepilogo.arretrati)}
            stato={riepilogo.arretrati > 0 ? "warn" : undefined}
            nota={riepilogo.arretrati > 0 ? formattaEuro(riepilogo.importoArretrati) : "sei in pari"}
          />
          <Metrica
            etichetta="Sospese"
            valore={String(riepilogo.sospese)}
            nota="non maturano scadenze"
          />
        </div>
      )}

      {ricorrenti.length === 0 ? (
        <Scheda>
          <Vuoto
            messaggio="Nessuna serie ricorrente. Servono per i canoni: manutenzioni, abbonamenti, consulenze a forfait mensile."
            azione={{ href: "/ricorrenti/nuovo", testo: "Crea la prima serie" }}
          />
        </Scheda>
      ) : (
        <Scheda>
          <div className="divide-y divide-line">
            {ricorrenti.map((ricorrente) => {
              const daEmettere = occorrenzeDaEmettere(ricorrente, oggi);
              const prossima = prossimaOccorrenza(ricorrente, oggi);

              return (
                <div key={ricorrente.id} className="px-4 sm:px-5 py-4 riga-interattiva">
                  <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
                    <Link href={`/ricorrenti/${ricorrente.id}`} className="min-w-0 flex-1 group">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium group-hover:text-accent transition">
                          {ricorrente.descrizione}
                        </span>
                        {!ricorrente.attiva && <Pillola>Sospesa</Pillola>}
                        {daEmettere.length > 0 && (
                          <Pillola tono="warn">
                            {daEmettere.length === 1
                              ? "1 da emettere"
                              : `${daEmettere.length} da emettere`}
                          </Pillola>
                        )}
                      </div>
                      <div className="text-sm text-ink-muted mt-0.5 truncate">
                        {nomi.get(ricorrente.clienteId) ?? "Cliente rimosso"}
                      </div>
                      <div className="text-xs text-ink-faint mt-1">
                        {ETICHETTE_CADENZA[ricorrente.cadenza]} ·{" "}
                        {formattaEuro(totaleRicorrente(ricorrente))} a scadenza ·{" "}
                        {formattaEuro(valoreAnnuo(ricorrente))} l&apos;anno
                        {ricorrente.dataFine && ` · fino al ${formattaData(ricorrente.dataFine)}`}
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {daEmettere.length > 0 ? (
                          <div className="text-sm text-warn">
                            scaduta il {formattaData(daEmettere[0])}
                          </div>
                        ) : prossima ? (
                          <div className="text-sm text-ink-muted">
                            prossima il {formattaData(prossima)}
                          </div>
                        ) : (
                          <div className="text-sm text-ink-faint">serie conclusa</div>
                        )}
                      </div>
                      {daEmettere.length > 0 && ricorrente.attiva && (
                        <form action={emettiProssima}>
                          <input type="hidden" name="id" value={ricorrente.id} />
                          <button type="submit" className="btn-primario text-xs px-3 py-1.5">
                            Emetti
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Scheda>
      )}
    </div>
  );
}
