import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiRicorrente } from "@/lib/data/ricorrenti";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { nomeCliente } from "@/lib/domain/cliente";
import { numeroFattura, totaleDocumento } from "@/lib/domain/fattura";
import {
  ETICHETTE_CADENZA,
  motivoNonEmettibile,
  occorrenzeDaEmettere,
  prossimaOccorrenza,
  totaleRicorrente,
  valoreAnnuo,
} from "@/lib/domain/ricorrenza";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Metrica, Pillola, Scheda, Vuoto } from "@/components/Pagina";
import { cambiaAttivazione, emettiProssima, rimuoviRicorrente } from "../actions";

export const metadata = { title: "Serie ricorrente — GAR Studio" };

export default async function PaginaRicorrente({ params }: PageProps<"/ricorrenti/[id]">) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();

  const [ricorrente, clienti, fatture] = await Promise.all([
    leggiRicorrente(supabase, user.id, id),
    leggiClienti(supabase, user.id),
    leggiFatture(supabase, user.id),
  ]);
  if (!ricorrente) notFound();

  const oggi = new Date().toISOString().slice(0, 10);
  const cliente = clienti.find((c) => c.id === ricorrente.clienteId);
  const daEmettere = occorrenzeDaEmettere(ricorrente, oggi);
  const prossima = prossimaOccorrenza(ricorrente, oggi);
  const bloccante = motivoNonEmettibile(ricorrente, oggi);
  const generate = fatture
    .filter((f) => f.ricorrenteId === ricorrente.id)
    .sort((a, b) => b.dataEmissione.localeCompare(a.dataEmissione));

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <IntestazionePagina
        titolo={ricorrente.descrizione}
        ritorno={{ href: "/ricorrenti", testo: "Ricorrenti" }}
        descrizione={`${ETICHETTE_CADENZA[ricorrente.cadenza]} · ${cliente ? nomeCliente(cliente) : "Cliente rimosso"}`}
        azioni={
          <>
            <form action={cambiaAttivazione}>
              <input type="hidden" name="id" value={ricorrente.id} />
              <input type="hidden" name="attiva" value={ricorrente.attiva ? "0" : "1"} />
              <button type="submit" className="btn-secondario">
                {ricorrente.attiva ? "Sospendi" : "Riattiva"}
              </button>
            </form>
            {!bloccante && (
              <form action={emettiProssima}>
                <input type="hidden" name="id" value={ricorrente.id} />
                <button type="submit" className="btn-primario">
                  Emetti {formattaData(daEmettere[0])}
                </button>
              </form>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metrica etichetta="Ogni scadenza" valore={formattaEuro(totaleRicorrente(ricorrente))} />
        <Metrica etichetta="Valore annuo" valore={formattaEuro(valoreAnnuo(ricorrente))} accento />
        <Metrica
          etichetta="Da emettere"
          valore={String(daEmettere.length)}
          stato={daEmettere.length > 0 ? "warn" : undefined}
        />
        <Metrica
          etichetta="Prossima scadenza"
          valore={prossima ? formattaData(prossima) : "—"}
          nota={ricorrente.dataFine ? `serie fino al ${formattaData(ricorrente.dataFine)}` : "senza fine"}
        />
      </div>

      {bloccante && (
        <div className="rounded-xl border border-line bg-surface-2 px-4 sm:px-5 py-4">
          <p className="text-sm text-ink-muted">{bloccante}</p>
        </div>
      )}

      {daEmettere.length > 0 && (
        <Scheda titolo="Scadenze maturate e non fatturate">
          <div className="divide-y divide-line">
            {daEmettere.map((data, indice) => (
              <div
                key={data}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-sm"
              >
                <span className={indice === 0 ? "text-ink" : "text-ink-muted"}>
                  {formattaData(data)}
                </span>
                <span className="tabular-nums text-ink-muted">
                  {formattaEuro(totaleRicorrente(ricorrente))}
                </span>
                {indice === 0 ? (
                  <Pillola tono="warn">la prossima</Pillola>
                ) : (
                  <span className="text-xs text-ink-faint">in coda</span>
                )}
              </div>
            ))}
          </div>
          <div className="px-4 sm:px-5 py-3 border-t border-line text-xs text-ink-faint">
            Si emette una scadenza alla volta, in bozza. Generarle tutte insieme significherebbe
            bruciare più progressivi con documenti che nessuno ha riletto.
          </div>
        </Scheda>
      )}

      <Scheda titolo="Righe di ogni fattura">
        <div className="divide-y divide-line">
          {ricorrente.righe.map((riga) => (
            <div key={riga.id} className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-4 text-sm">
              <span className="min-w-0 flex-1">{riga.descrizione}</span>
              <span className="text-ink-muted tabular-nums shrink-0">
                {riga.quantita} {riga.unitaMisura ?? ""} × {formattaEuro(riga.prezzoUnitario)}
              </span>
            </div>
          ))}
        </div>
      </Scheda>

      <Scheda titolo="Fatture nate da questa serie">
        {generate.length === 0 ? (
          <Vuoto messaggio="Nessuna fattura emessa da questa serie, per ora." />
        ) : (
          <div className="divide-y divide-line">
            {generate.map((fattura) => (
              <Link
                key={fattura.id}
                href={`/fatture/${fattura.id}`}
                className="px-4 sm:px-5 py-3 flex items-center justify-between gap-4 text-sm riga-interattiva"
              >
                <span>
                  <span className="text-ink-faint">{numeroFattura(fattura)}</span>{" "}
                  {formattaData(fattura.dataEmissione)}
                </span>
                <span className="flex items-center gap-3 shrink-0">
                  {fattura.stato === "incassata" ? (
                    <Pillola tono="ok">Incassata</Pillola>
                  ) : fattura.stato === "bozza" ? (
                    <Pillola>Bozza</Pillola>
                  ) : (
                    <Pillola tono="accento">Emessa</Pillola>
                  )}
                  <span className="tabular-nums">{formattaEuro(totaleDocumento(fattura))}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </Scheda>

      {ricorrente.note && (
        <Scheda titolo="Note interne">
          <p className="px-4 sm:px-5 py-3 text-sm text-ink-muted whitespace-pre-wrap">{ricorrente.note}</p>
        </Scheda>
      )}

      <details className="group rounded-xl border border-line bg-surface overflow-hidden">
        <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Elimina la serie</div>
            <div className="text-xs text-ink-muted mt-0.5">Le fatture già emesse restano</div>
          </div>
          <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
            <span className="group-open:hidden">Apri</span>
            <span className="hidden group-open:inline">Chiudi</span>
          </span>
        </summary>
        <div className="px-4 sm:px-5 pb-5 pt-4 border-t border-line flex flex-col gap-4">
          <ul className="flex flex-col gap-1.5">
            {[
              "La serie smette di proporre scadenze.",
              `Le ${generate.length === 1 ? "1 fattura" : `${generate.length} fatture`} già emesse restano dove sono: sono documenti fiscali, non appartengono alla serie.`,
              "Se serve solo fermarla, «Sospendi» la mette in pausa senza perdere gli arretrati.",
            ].map((avviso) => (
              <li key={avviso} className="text-sm text-ink-muted flex gap-2">
                <span aria-hidden="true" className="text-ink-faint">
                  —
                </span>
                <span>{avviso}</span>
              </li>
            ))}
          </ul>
          <form action={rimuoviRicorrente}>
            <input type="hidden" name="id" value={ricorrente.id} />
            <button
              type="submit"
              className="rounded-lg border border-danger/50 bg-danger-soft text-danger text-sm font-medium px-4 py-2.5 hover:bg-danger/15 transition"
            >
              Elimina definitivamente
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}
