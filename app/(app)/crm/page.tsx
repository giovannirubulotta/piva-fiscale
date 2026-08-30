import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiAttivita, leggiTrattative } from "@/lib/data/crm";
import { nomeCliente } from "@/lib/domain/cliente";
import {
  ETICHETTE_ATTIVITA,
  passiDaFare,
  pipeline,
  tassoDiConversione,
  trattativeFerme,
  valoreAperto,
  valorePonderato,
} from "@/lib/domain/crm";
import { formattaData, formattaEuro, giorniMancanti } from "@/lib/ui/format";
import { NuovaAttivitaForm, NuovaTrattativaForm } from "./Moduli";
import { completaPasso, rimuoviTrattativa, spostaTrattativa } from "./actions";

export default async function PaginaCrm() {
  const { supabase, user } = await richiediUtente();

  const [clienti, trattative, attivita] = await Promise.all([
    leggiClienti(supabase, user.id),
    leggiTrattative(supabase, user.id),
    leggiAttivita(supabase, user.id),
  ]);

  const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const opzioniClienti = clienti
    .map((c) => ({ id: c.id, nome: nomeCliente(c) }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));

  const oggi = new Date().toISOString().slice(0, 10);
  const colonne = pipeline(trattative);
  const aperto = valoreAperto(trattative);
  const ponderato = valorePonderato(trattative);
  const conversione = tassoDiConversione(trattative);
  const daFare = passiDaFare(attivita);
  const ferme = trattativeFerme(trattative, attivita, oggi);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Trattative</h1>
        <p className="text-sm text-ink-muted">
          Cosa è in corso, quanto vale davvero e chi è fermo da troppo tempo. Nessuno perde una trattativa
          decidendo di perderla: smette di seguirla senza accorgersene.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Riquadro etichetta="In pipeline" valore={formattaEuro(aperto)} nota={`${trattative.filter((t) => t.fase !== "vinta" && t.fase !== "persa").length} aperte`} />
        <Riquadro etichetta="Valore ponderato" valore={formattaEuro(ponderato)} nota="pesato per probabilità" accento />
        <Riquadro
          etichetta="Trattative vinte"
          valore={conversione.percentuale === null ? "—" : `${conversione.percentuale}%`}
          nota={conversione.percentuale === null ? "nessuna ancora chiusa" : `${conversione.vinte} su ${conversione.vinte + conversione.perse}`}
        />
        <Riquadro etichetta="Valore vinto" valore={formattaEuro(conversione.valoreVinto)} nota="trattative chiuse positivamente" />
      </div>

      {daFare.length > 0 && (
        <section className="rounded-xl border border-line bg-surface overflow-hidden">
          <div className="px-4 sm:px-5 py-3 border-b border-line text-xs text-ink-muted uppercase tracking-wide">
            Da fare
          </div>
          <ul className="divide-y divide-line">
            {daFare.slice(0, 8).map((passo) => {
              const giorni = passo.dataProssimoPasso ? giorniMancanti(passo.dataProssimoPasso) : 0;
              return (
                <li key={passo.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center gap-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div>{passo.prossimoPasso}</div>
                    <div className="text-xs mt-0.5">
                      <Link href={`/clienti/${passo.clienteId}`} className="text-accent hover:underline">
                        {nomi.get(passo.clienteId) ?? "Cliente"}
                      </Link>
                      <span className={giorni < 0 ? "text-danger" : giorni <= 3 ? "text-warn" : "text-ink-faint"}>
                        {" · "}
                        {giorni < 0
                          ? `in ritardo di ${Math.abs(giorni)} ${Math.abs(giorni) === 1 ? "giorno" : "giorni"}`
                          : giorni === 0
                            ? "oggi"
                            : `tra ${giorni} ${giorni === 1 ? "giorno" : "giorni"}`}
                      </span>
                    </div>
                  </div>
                  <form action={completaPasso} className="shrink-0">
                    <input type="hidden" name="id" value={passo.id} />
                    <button type="submit" className="btn-secondario text-xs px-3 py-1.5">
                      Fatto
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {ferme.length > 0 && (
        <section className="rounded-xl border border-warn/40 bg-warn/10 px-4 sm:px-5 py-4">
          <p className="text-sm text-warn font-medium mb-2">
            {ferme.length === 1 ? "Una trattativa è ferma" : `${ferme.length} trattative sono ferme`}
          </p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {ferme.slice(0, 5).map(({ trattativa, giorniDaUltimoContatto, ultimoContatto }) => (
              <li key={trattativa.id} className="text-warn/90">
                <Link href={`/clienti/${trattativa.clienteId}`} className="underline">
                  {trattativa.titolo}
                </Link>{" "}
                · {nomi.get(trattativa.clienteId) ?? "Cliente"} · {giorniDaUltimoContatto} giorni
                {ultimoContatto ? ` dall'ultimo contatto` : " senza nessun contatto registrato"}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-3 items-start">
        {colonne.map((colonna) => (
          <section key={colonna.fase} className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="px-4 py-3 border-b border-line flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{colonna.etichetta}</span>
              <span className="text-xs text-ink-muted tabular-nums">{formattaEuro(colonna.totale)}</span>
            </div>
            {colonna.trattative.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-ink-faint">Nessuna trattativa qui.</p>
            ) : (
              <ul className="divide-y divide-line">
                {colonna.trattative.map((trattativa) => (
                  <li key={trattativa.id} className="px-4 py-3 flex flex-col gap-2">
                    <div>
                      <div className="text-sm">{trattativa.titolo}</div>
                      <div className="text-xs mt-0.5">
                        <Link href={`/clienti/${trattativa.clienteId}`} className="text-accent hover:underline">
                          {nomi.get(trattativa.clienteId) ?? "Cliente"}
                        </Link>
                      </div>
                      <div className="text-xs text-ink-faint mt-1 tabular-nums">
                        {formattaEuro(trattativa.valoreStimato)} · {trattativa.probabilita}%
                        {trattativa.dataPrevista && ` · chiusura ${formattaData(trattativa.dataPrevista)}`}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {AVANZAMENTO[colonna.fase] && (
                        <FormaFase id={trattativa.id} fase={AVANZAMENTO[colonna.fase]!} etichetta="Avanza" />
                      )}
                      <FormaFase id={trattativa.id} fase="vinta" etichetta="Vinta" />
                      <FormaFase id={trattativa.id} fase="persa" etichetta="Persa" />
                      <form action={rimuoviTrattativa}>
                        <input type="hidden" name="id" value={trattativa.id} />
                        <button type="submit" className="text-xs text-ink-faint hover:text-danger px-2 py-1">
                          elimina
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <NuovaTrattativaForm clienti={opzioniClienti} />
        <NuovaAttivitaForm clienti={opzioniClienti} />
      </div>

      {attivita.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">Ultimi contatti</h2>
          <ul className="rounded-xl border border-line bg-surface divide-y divide-line">
            {attivita.slice(0, 10).map((a) => (
              <li key={a.id} className="px-4 sm:px-5 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-ink-faint">
                  <span>{formattaData(a.data)}</span>
                  <span>· {ETICHETTE_ATTIVITA[a.tipo]}</span>
                  <Link href={`/clienti/${a.clienteId}`} className="text-accent hover:underline">
                    {nomi.get(a.clienteId) ?? "Cliente"}
                  </Link>
                </div>
                <p className="mt-1">{a.testo}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {clienti.length === 0 && (
        <p className="text-sm text-ink-muted">
          Non c&apos;è ancora nessun cliente in anagrafica.{" "}
          <Link href="/clienti/nuovo" className="text-accent hover:underline">
            Aggiungine uno
          </Link>{" "}
          per cominciare a tracciare le trattative.
        </p>
      )}
    </div>
  );
}

/** Dove va una trattativa quando avanza. L'ultima fase aperta non avanza: si chiude. */
const AVANZAMENTO: Record<string, "qualificata" | "proposta" | undefined> = {
  contatto: "qualificata",
  qualificata: "proposta",
  proposta: undefined,
};

function FormaFase({ id, fase, etichetta }: { id: string; fase: string; etichetta: string }) {
  return (
    <form action={spostaTrattativa}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="fase" value={fase} />
      <button type="submit" className="btn-secondario text-xs px-2.5 py-1">
        {etichetta}
      </button>
    </form>
  );
}

function Riquadro({
  etichetta,
  valore,
  nota,
  accento,
}: {
  etichetta: string;
  valore: string;
  nota: string;
  accento?: boolean;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted mb-1.5">{etichetta}</div>
      <div className={`text-lg font-semibold tabular-nums ${accento ? "text-accent" : "text-ink"}`}>{valore}</div>
      <div className="text-xs text-ink-faint mt-1">{nota}</div>
    </div>
  );
}
