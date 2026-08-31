import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { leggiPreventivi } from "@/lib/data/preventivi";
import { leggiNoteDiCliente } from "@/lib/data/note";
import { leggiEventi } from "@/lib/data/eventi";
import { leggiAttivitaDiCliente, leggiTrattativeDiCliente } from "@/lib/data/crm";
import { ClienteForm } from "../ClienteForm";
import { salvaModificaCliente } from "../actions";
import { nomeCliente } from "@/lib/domain/cliente";
import { ETICHETTE_FASE, aperta } from "@/lib/domain/crm";
import {
  ETICHETTE_VOCE,
  cronologia,
  riepilogoRapporto,
  type TonoVoce,
  type VoceCronologia,
} from "@/lib/domain/cronologia";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { NuovaAttivitaForm } from "@/app/(app)/crm/Moduli";
import { NotaEditor } from "@/app/(app)/note/NotaEditor";
import { IntestazionePagina, Metrica, Pillola, Scheda, TitoloSezione, Vuoto } from "@/components/Pagina";

/**
 * La scheda cliente: tutto quello che riguarda quella persona, in ordine di
 * tempo.
 *
 * Prima erano tre elenchi affiancati — contatti, documenti, trattative — e
 * ricostruire «cosa è successo ultimamente» richiedeva di leggerli tutti e tre
 * e ordinarli a mente. È l'operazione che si sbaglia mentre il telefono
 * squilla, quindi la fa il software: una cronologia sola, dal più recente.
 */
export default async function PaginaCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();

  const cliente = await leggiCliente(supabase, user.id, id);
  if (!cliente) notFound();

  const [fatture, preventivi, trattative, attivita, note, eventi] = await Promise.all([
    leggiFatture(supabase, user.id),
    leggiPreventivi(supabase, user.id),
    leggiTrattativeDiCliente(supabase, user.id, id),
    leggiAttivitaDiCliente(supabase, user.id, id),
    leggiNoteDiCliente(supabase, user.id, id),
    leggiEventi(supabase, user.id),
  ]);

  const oggi = new Date().toISOString().slice(0, 10);
  const sue = fatture.filter((f) => f.clienteId === id);
  const suoiPreventivi = preventivi.filter((p) => p.clienteId === id);
  const suoiEventi = eventi.filter((e) => e.clienteId === id);

  const voci = cronologia(
    { attivita, note, preventivi: suoiPreventivi, fatture: sue, eventi: suoiEventi },
    oggi
  );
  const riepilogo = riepilogoRapporto(voci, sue, oggi);
  const aperte = trattative.filter(aperta);

  return (
    <div className="flex flex-col gap-6">
      <IntestazionePagina
        ritorno={{ href: "/clienti", testo: "Clienti" }}
        titolo={nomeCliente(cliente)}
        descrizione={
          [cliente.partitaIva || cliente.codiceFiscale, cliente.comune].filter(Boolean).join(" · ") ||
          "Nessun identificativo fiscale registrato"
        }
        azioni={
          <>
            <Link href={`/preventivi/nuovo?cliente=${id}`} className="btn-secondario">
              Preventivo
            </Link>
            <Link href={`/fatture/nuova?cliente=${id}`} className="btn-primario">
              Fattura
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metrica
          etichetta="Fatturato con lui"
          valore={formattaEuro(riepilogo.fatturatoTotale)}
          accento
          nota={`${sue.filter((f) => f.stato !== "annullata").length} documenti`}
        />
        <Metrica
          etichetta="Come paga"
          valore={riepilogo.giorniMediDiIncasso === null ? "—" : `${riepilogo.giorniMediDiIncasso} gg`}
          nota={
            riepilogo.giorniMediDiIncasso === null
              ? "nessuna fattura ancora incassata"
              : "media tra emissione e incasso"
          }
          stato={
            riepilogo.giorniMediDiIncasso === null
              ? undefined
              : riepilogo.giorniMediDiIncasso > 60
                ? "danger"
                : riepilogo.giorniMediDiIncasso > 40
                  ? "warn"
                  : "ok"
          }
        />
        <Metrica
          etichetta="Trattative aperte"
          valore={String(aperte.length)}
          nota={formattaEuro(aperte.reduce((somma, t) => somma + t.valoreStimato, 0))}
        />
        <Metrica
          etichetta="Ultimo contatto"
          valore={riepilogo.ultimoContatto ? formattaData(riepilogo.ultimoContatto) : "—"}
          nota={
            riepilogo.giorniDaUltimoContatto === null
              ? "nessuno registrato"
              : riepilogo.giorniDaUltimoContatto === 0
                ? "oggi"
                : `${riepilogo.giorniDaUltimoContatto} giorni fa`
          }
          stato={
            riepilogo.giorniDaUltimoContatto !== null && riepilogo.giorniDaUltimoContatto > 60
              ? "warn"
              : undefined
          }
        />
      </div>

      {riepilogo.inProgramma.length > 0 && (
        <Scheda titolo="In programma">
          <ElencoCronologia voci={riepilogo.inProgramma} />
        </Scheda>
      )}

      {trattative.length > 0 && (
        <section>
          <TitoloSezione collegamento={{ href: "/crm", testo: "Pipeline" }}>Trattative</TitoloSezione>
          <ul className="scheda divide-y divide-line">
            {trattative.map((t) => (
              <li
                key={t.id}
                className="px-4 sm:px-5 py-3 flex flex-wrap items-baseline justify-between gap-3 text-sm"
              >
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

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Scheda titolo="Registra un contatto">
          <div className="px-4 sm:px-5 py-4">
            <NuovaAttivitaForm clienti={[]} clienteFisso={id} senzaCornice />
          </div>
        </Scheda>
        <Scheda titolo="Annota qualcosa su di lui">
          <div className="px-4 sm:px-5 py-4">
            <NotaEditor clienti={[{ id, nome: nomeCliente(cliente) }]} clientePredefinito={id} />
          </div>
        </Scheda>
      </div>

      <section>
        <TitoloSezione>Cronologia</TitoloSezione>
        <Scheda>
          {voci.length === 0 ? (
            <Vuoto messaggio="Ancora niente. Registra un contatto o emetti un documento e comincerà a riempirsi." />
          ) : (
            <ElencoCronologia voci={voci.filter((v) => !v.futuro)} conAncora />
          )}
        </Scheda>
      </section>

      <details className="group scheda overflow-hidden">
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

const TONO_TESTO: Record<TonoVoce, string> = {
  neutro: "text-ink-muted",
  accento: "text-accent",
  ok: "text-ok",
  warn: "text-warn",
  danger: "text-danger",
};

const TONO_PUNTO: Record<TonoVoce, string> = {
  neutro: "bg-ink-faint",
  accento: "bg-accent",
  ok: "bg-ok",
  warn: "bg-warn",
  danger: "bg-danger",
};

/**
 * La cronologia come colonna con una linea verticale.
 *
 * La linea non è decorazione: rende visibile che le voci sono un'unica
 * sequenza e non un elenco di categorie. È l'informazione che la pagina esiste
 * per dare.
 */
function ElencoCronologia({ voci, conAncora = false }: { voci: VoceCronologia[]; conAncora?: boolean }) {
  return (
    <ol className="px-4 sm:px-5 py-4 flex flex-col">
      {voci.map((voce, indice) => (
        <li key={voce.chiave} className="flex gap-3">
          <div className="flex flex-col items-center shrink-0 pt-1.5">
            <span className={`size-2 rounded-full shrink-0 ${TONO_PUNTO[voce.tono]}`} aria-hidden="true" />
            {conAncora && indice < voci.length - 1 && (
              <span className="w-px flex-1 bg-line mt-1" aria-hidden="true" />
            )}
          </div>

          <div className="min-w-0 flex-1 pb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              {voce.href ? (
                <Link href={voce.href} className="text-sm hover:text-accent transition">
                  {voce.titolo}
                </Link>
              ) : (
                <span className="text-sm">{voce.titolo}</span>
              )}
              <div className="text-xs text-ink-faint mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                <time dateTime={voce.data}>{formattaData(voce.data)}</time>
                <Pillola>{ETICHETTE_VOCE[voce.tipo]}</Pillola>
                {voce.dettaglio && <span className={TONO_TESTO[voce.tono]}>{voce.dettaglio}</span>}
              </div>
            </div>
            {voce.importo !== null && (
              <span className="text-sm tabular-nums shrink-0">{formattaEuro(voce.importo)}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
