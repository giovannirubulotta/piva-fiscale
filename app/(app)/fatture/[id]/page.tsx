import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { leggiFattura } from "@/lib/data/fatture";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { IMPORTO_BOLLO, dataScadenzaPagamento, numeroFattura, totaleDocumento, totaleRiga, totaleRighe } from "@/lib/domain/fattura";
import { validaFatturaPerXml } from "@/lib/domain/fatturaXml";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { StatoBadge } from "@/components/StatoBadge";
import { cambiaStatoFattura, rimuoviFattura, segnaIncassata } from "../actions";

export default async function PaginaFattura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();

  const fattura = await leggiFattura(supabase, user.id, id);
  if (!fattura) notFound();

  const [cliente, emittente] = await Promise.all([
    leggiCliente(supabase, user.id, fattura.clienteId),
    leggiDatiEmittente(supabase, user.id),
  ]);

  const riferimento = fattura.fatturaRiferimentoId
    ? await leggiFattura(supabase, user.id, fattura.fatturaRiferimentoId)
    : null;

  const erroriXml =
    cliente && emittente
      ? validaFatturaPerXml({
          fattura,
          cliente,
          emittente,
          fatturaRiferimento: riferimento
            ? { numero: numeroFattura(riferimento), data: riferimento.dataEmissione }
            : null,
        })
      : [{ campo: "profilo", messaggio: "Completa i dati anagrafici in Impostazioni." }];

  const imponibile = totaleRighe(fattura.righe);
  const totale = totaleDocumento(fattura);
  const nomeCliente = cliente
    ? (cliente.denominazione ?? [cliente.nome, cliente.cognome].filter(Boolean).join(" ")) || "Senza nome"
    : "—";

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <Link href="/fatture" className="text-xs text-ink-muted hover:text-ink">
          ← Fatture
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <h1 className="text-xl font-semibold">
            {fattura.tipoDocumento === "TD04" ? "Nota di credito" : "Fattura"} {numeroFattura(fattura)}
          </h1>
          <StatoBadge stato={fattura.stato} />
        </div>
        <p className="text-sm text-ink-muted mt-1">
          {nomeCliente} · {formattaData(fattura.dataEmissione)}
          {riferimento && ` · storna la fattura ${numeroFattura(riferimento)}`}
        </p>
      </div>

      {/* Azioni: in cima e a piena larghezza su mobile, dove sono la cosa che si tocca */}
      <div className="flex flex-wrap gap-2">
        {erroriXml.length === 0 ? (
          <a href={`/api/fatture/${fattura.id}/xml`} className="btn-primario">
            Scarica XML per lo SDI
          </a>
        ) : (
          <button type="button" disabled className="btn-primario" title="Completa i dati mancanti">
            Scarica XML per lo SDI
          </button>
        )}
        <Link href={`/fatture/${fattura.id}/stampa`} className="btn-secondario">
          Stampa / PDF
        </Link>
        {fattura.stato === "emessa" && (
          <form action={segnaIncassata}>
            <input type="hidden" name="id" value={fattura.id} />
            <button type="submit" className="btn-secondario">
              Segna incassata
            </button>
          </form>
        )}
        {fattura.stato === "bozza" && (
          <form action={cambiaStatoFattura}>
            <input type="hidden" name="id" value={fattura.id} />
            <input type="hidden" name="stato" value="emessa" />
            <button type="submit" className="btn-secondario">
              Segna emessa
            </button>
          </form>
        )}
      </div>

      {erroriXml.length > 0 && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn flex flex-col gap-2">
          <p className="font-medium">
            Manca qualcosa prima di poter generare l&apos;XML per lo SDI
          </p>
          <ul className="text-xs flex flex-col gap-1">
            {erroriXml.map((errore) => (
              <li key={errore.campo}>
                · {errore.messaggio}
                {"codiceSdi" in errore && errore.codiceSdi && (
                  <span className="text-warn/70"> (eviterebbe lo scarto {errore.codiceSdi})</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-warn/80">
            Correggi in{" "}
            <Link href="/impostazioni" className="underline">
              Impostazioni
            </Link>{" "}
            {cliente && (
              <>
                o in{" "}
                <Link href={`/clienti/${cliente.id}`} className="underline">
                  anagrafica cliente
                </Link>
              </>
            )}
            .
          </p>
        </div>
      )}

      {fattura.xmlProgressivo && (
        <div className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs text-ink-muted">
          XML già generato con progressivo <span className="font-mono text-ink">{fattura.xmlProgressivo}</span>. Il
          nome del file non viene mai riutilizzato: se lo SDI lo scarta, la correzione va inviata con un nome nuovo.
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="px-4 sm:px-5 py-3 border-b border-line text-xs text-ink-muted uppercase tracking-wide">
          Prestazioni
        </div>
        <div className="divide-y divide-line">
          {fattura.righe.map((riga) => (
            <div key={riga.id} className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-4 text-sm">
              <div className="min-w-0">
                <div>{riga.descrizione}</div>
                <div className="text-xs text-ink-faint">
                  {riga.quantita} {riga.unitaMisura ?? ""} × {formattaEuro(riga.prezzoUnitario)}
                </div>
              </div>
              <div className="shrink-0 tabular-nums">{formattaEuro(totaleRiga(riga))}</div>
            </div>
          ))}
          {fattura.bolloApplicato && fattura.bolloRiaddebitato && (
            <div className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-4 text-sm text-ink-muted">
              <div className="text-xs">Imposta di bollo assolta in modo virtuale (riaddebitata)</div>
              <div className="shrink-0 tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</div>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-4 border-t border-line bg-surface-2 flex flex-col gap-1.5 text-sm">
          <div className="flex justify-between text-ink-muted text-xs">
            <span>Imponibile</span>
            <span className="tabular-nums">{formattaEuro(imponibile)}</span>
          </div>
          {fattura.bolloApplicato && !fattura.bolloRiaddebitato && (
            <div className="flex justify-between text-ink-faint text-xs">
              <span>Bollo virtuale a tuo carico</span>
              <span className="tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium">
            <span>Totale</span>
            <span className="tabular-nums text-accent">{formattaEuro(totale)}</span>
          </div>
          <div className="text-xs text-ink-faint">
            Pagamento entro il {formattaData(dataScadenzaPagamento(fattura))}
            {fattura.dataIncasso && ` · incassata il ${formattaData(fattura.dataIncasso)}`}
          </div>
        </div>
      </div>

      {fattura.note && <p className="text-xs text-ink-faint">Note interne: {fattura.note}</p>}

      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
        {fattura.stato !== "annullata" && (
          <form action={cambiaStatoFattura}>
            <input type="hidden" name="id" value={fattura.id} />
            <input type="hidden" name="stato" value="annullata" />
            <button type="submit" className="text-xs text-ink-muted hover:text-ink">
              annulla documento
            </button>
          </form>
        )}
        <form action={rimuoviFattura}>
          <input type="hidden" name="id" value={fattura.id} />
          <button type="submit" className="text-xs text-danger hover:underline">
            elimina definitivamente
          </button>
        </form>
      </div>
    </div>
  );
}
