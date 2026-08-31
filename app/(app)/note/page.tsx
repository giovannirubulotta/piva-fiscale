import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiNote } from "@/lib/data/note";
import { leggiClienti } from "@/lib/data/clienti";
import { nomeCliente } from "@/lib/domain/cliente";
import { anteprima, etichetteUsate, filtra, intestazione, ordina } from "@/lib/domain/nota";
import { IntestazionePagina, Pillola, Scheda, Vuoto } from "@/components/Pagina";
import { NotaEditor } from "./NotaEditor";
import { cambiaFissata, rimuoviNota } from "./actions";

export const metadata = { title: "Note — GAR Studio" };

export default async function PaginaNote({ searchParams }: PageProps<"/note">) {
  const parametri = await searchParams;
  const { supabase, user } = await richiediUtente();

  const [note, clienti] = await Promise.all([
    leggiNote(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);

  const termine = typeof parametri.q === "string" ? parametri.q : "";
  const etichettaScelta = typeof parametri.etichetta === "string" ? parametri.etichetta : null;

  const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const etichette = etichetteUsate(note);

  let visibili = ordina(filtra(note, termine));
  if (etichettaScelta) visibili = visibili.filter((n) => n.etichette.includes(etichettaScelta));

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        titolo="Note"
        descrizione="Gli appunti che altrimenti finiscono su un foglio. Collegarli a un cliente è facoltativo: si può fare dopo, quando la nota ha trovato il suo posto."
      />

      <Scheda titolo="Nuova nota">
        <div className="px-4 sm:px-5 py-4">
          <NotaEditor clienti={clienti.map((c) => ({ id: c.id, nome: nomeCliente(c) }))} />
        </div>
      </Scheda>

      {note.length > 0 && (
        <div className="flex flex-col gap-3">
          {/* La ricerca è un modulo GET: il termine finisce nell'indirizzo,
              quindi una ricerca si può salvare e il tasto indietro funziona. */}
          <form action="/note" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={termine}
              className="campo-input"
              placeholder="Cerca nel testo, nei titoli, nelle etichette…"
            />
            {etichettaScelta && <input type="hidden" name="etichetta" value={etichettaScelta} />}
            <button type="submit" className="btn-secondario shrink-0">
              Cerca
            </button>
          </form>

          {etichette.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Link
                href={termine ? `/note?q=${encodeURIComponent(termine)}` : "/note"}
                className={`pillola border ${
                  etichettaScelta ? "border-line bg-surface text-ink-muted" : "border-accent bg-accent-soft text-accent"
                }`}
              >
                Tutte
              </Link>
              {etichette.map(({ etichetta, conteggio }) => {
                const attiva = etichetta === etichettaScelta;
                const parametriLink = new URLSearchParams();
                if (termine) parametriLink.set("q", termine);
                if (!attiva) parametriLink.set("etichetta", etichetta);
                const query = parametriLink.toString();
                return (
                  <Link
                    key={etichetta}
                    href={query ? `/note?${query}` : "/note"}
                    className={`pillola border ${
                      attiva
                        ? "border-accent bg-accent-soft text-accent"
                        : "border-line bg-surface text-ink-muted hover:text-ink"
                    }`}
                  >
                    {etichetta}
                    <span className="text-ink-faint tabular-nums">{conteggio}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {visibili.length === 0 ? (
        <Scheda>
          <Vuoto
            messaggio={
              note.length === 0
                ? "Nessuna nota. Serve per gli appunti di una telefonata, un'idea, le condizioni pattuite a voce."
                : "Nessuna nota corrisponde alla ricerca."
            }
          />
        </Scheda>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {visibili.map((nota) => {
            const corpo = anteprima(nota);
            return (
              <article key={nota.id} className="scheda p-4 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-medium leading-snug min-w-0">{intestazione(nota)}</h2>
                  <form action={cambiaFissata} className="shrink-0">
                    <input type="hidden" name="id" value={nota.id} />
                    <input type="hidden" name="fissata" value={nota.fissata ? "0" : "1"} />
                    <button
                      type="submit"
                      aria-label={nota.fissata ? "Togli dall'alto" : "Fissa in alto"}
                      title={nota.fissata ? "Togli dall'alto" : "Fissa in alto"}
                      className={`text-xs transition ${
                        nota.fissata ? "text-warn" : "text-ink-faint hover:text-ink"
                      }`}
                    >
                      {nota.fissata ? "● fissata" : "○ fissa"}
                    </button>
                  </form>
                </div>

                {corpo && <p className="text-sm text-ink-muted leading-relaxed">{corpo}</p>}

                <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
                  {nota.clienteId && (
                    <Link href={`/clienti/${nota.clienteId}`}>
                      <Pillola tono="accento">{nomi.get(nota.clienteId) ?? "cliente rimosso"}</Pillola>
                    </Link>
                  )}
                  {nota.etichette.map((etichetta) => (
                    <Pillola key={etichetta}>{etichetta}</Pillola>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-line">
                  <time className="text-xs text-ink-faint" dateTime={nota.aggiornataIl}>
                    {new Date(nota.aggiornataIl).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                  <form action={rimuoviNota}>
                    <input type="hidden" name="id" value={nota.id} />
                    <button type="submit" className="text-xs text-ink-faint hover:text-danger transition">
                      elimina
                    </button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
