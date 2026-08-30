import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { leggiAttivitaDiCliente, leggiTrattativeDiCliente } from "@/lib/data/crm";
import { ClienteForm } from "../ClienteForm";
import { salvaModificaCliente } from "../actions";
import { nomeCliente } from "@/lib/domain/cliente";
import { numeroFattura, totaleDocumento } from "@/lib/domain/fattura";
import { ETICHETTE_ATTIVITA, ETICHETTE_FASE, aperta, valorePerCliente } from "@/lib/domain/crm";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { NuovaAttivitaForm } from "@/app/(app)/crm/Moduli";
import { StatoBadge } from "@/components/StatoBadge";

/**
 * La scheda cliente non è più un modulo da correggere: è il posto dove si vede
 * tutto quello che lo riguarda — quanto ha fatturato, cosa è in corso, quando
 * ci si è parlati l'ultima volta. I dati anagrafici finiscono in fondo, dietro
 * un pannello: si toccano una volta e non si guardano più.
 */
export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();

  const cliente = await leggiCliente(supabase, user.id, id);
  if (!cliente) notFound();

  const [fatture, trattative, attivita] = await Promise.all([
    leggiFatture(supabase, user.id),
    leggiTrattativeDiCliente(supabase, user.id, id),
    leggiAttivitaDiCliente(supabase, user.id, id),
  ]);

  const sue = fatture.filter((f) => f.clienteId === id);
  const valore = valorePerCliente(
    sue.map((f) => ({
      clienteId: f.clienteId,
      tipoDocumento: f.tipoDocumento,
      dataEmissione: f.dataEmissione,
      totale: totaleDocumento(f),
      annullata: f.stato === "annullata",
    }))
  ).get(id);

  const aperte = trattative.filter(aperta);
  const ultimoContatto = attivita[0]?.data ?? null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/clienti" className="text-xs text-ink-muted hover:text-ink">
          ← Clienti
        </Link>
        <h1 className="text-xl font-semibold mt-2">{nomeCliente(cliente)}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {[cliente.partitaIva || cliente.codiceFiscale, cliente.comune].filter(Boolean).join(" · ") ||
            "Nessun identificativo fiscale registrato"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Riquadro
          etichetta="Fatturato"
          valore={formattaEuro(valore?.fatturatoTotale ?? 0)}
          nota={`${valore?.documenti ?? 0} documenti`}
          accento
        />
        <Riquadro
          etichetta="Ultima fattura"
          valore={valore?.ultimaFattura ? formattaData(valore.ultimaFattura) : "—"}
          nota={valore?.ultimaFattura ? "" : "mai fatturato"}
        />
        <Riquadro
          etichetta="Trattative aperte"
          valore={String(aperte.length)}
          nota={formattaEuro(aperte.reduce((somma, t) => somma + t.valoreStimato, 0))}
        />
        <Riquadro
          etichetta="Ultimo contatto"
          valore={ultimoContatto ? formattaData(ultimoContatto) : "—"}
          nota={ultimoContatto ? "" : "nessuno registrato"}
        />
      </div>

      {trattative.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">Trattative</h2>
          <ul className="rounded-xl border border-line bg-surface divide-y divide-line">
            {trattative.map((t) => (
              <li key={t.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-baseline justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div>{t.titolo}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    {ETICHETTE_FASE[t.fase]}
                    {t.dataChiusura && ` · chiusa il ${formattaData(t.dataChiusura)}`}
                  </div>
                </div>
                <div className="tabular-nums shrink-0">
                  {formattaEuro(t.valoreStimato)}
                  {aperta(t) && <span className="text-xs text-ink-faint"> · {t.probabilita}%</span>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <NuovaAttivitaForm clienti={[]} clienteFisso={id} />

      {attivita.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">Storico dei contatti</h2>
          <ol className="rounded-xl border border-line bg-surface divide-y divide-line">
            {attivita.map((a) => (
              <li key={a.id} className="px-4 sm:px-5 py-3 text-sm">
                <div className="text-xs text-ink-faint">
                  {formattaData(a.data)} · {ETICHETTE_ATTIVITA[a.tipo]}
                </div>
                <p className="mt-1">{a.testo}</p>
                {a.prossimoPasso && (
                  <p className={`text-xs mt-1 ${a.fatto ? "text-ink-faint line-through" : "text-warn"}`}>
                    Prossimo passo: {a.prossimoPasso}
                    {a.dataProssimoPasso && ` entro il ${formattaData(a.dataProssimoPasso)}`}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {sue.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide mb-3">Documenti emessi</h2>
          <ul className="rounded-xl border border-line bg-surface divide-y divide-line">
            {sue.slice(0, 10).map((f) => (
              <li key={f.id} className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/fatture/${f.id}`} className="min-w-0 flex-1 hover:text-accent transition">
                  <span>{numeroFattura(f)}</span>
                  <span className="text-xs text-ink-faint"> · {formattaData(f.dataEmissione)}</span>
                </Link>
                <StatoBadge stato={f.stato} />
                <span className="tabular-nums shrink-0">{formattaEuro(totaleDocumento(f))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details className="group rounded-xl border border-line bg-surface overflow-hidden">
        <summary className="marker:hidden [&::-webkit-details-marker]:hidden px-4 sm:px-5 py-3.5 cursor-pointer select-none flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">Dati anagrafici e fiscali</div>
            <div className="text-xs text-ink-muted mt-0.5">Quelli che finiscono nell&apos;XML per lo SDI</div>
          </div>
          <span className="shrink-0 text-xs text-ink-muted border border-line rounded-lg px-3 py-1.5">
            <span className="group-open:hidden">Modifica</span>
            <span className="hidden group-open:inline">Chiudi</span>
          </span>
        </summary>
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-line">
          <ClienteForm cliente={cliente} azione={salvaModificaCliente} />
        </div>
      </details>
    </div>
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
      {nota && <div className="text-xs text-ink-faint mt-1">{nota}</div>}
    </div>
  );
}
