import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiCliente } from "@/lib/data/clienti";
import { leggiFattura } from "@/lib/data/fatture";
import { leggiDatiEmittente } from "@/lib/data/profilo";
import { IMPORTO_BOLLO, dataScadenzaPagamento, numeroFattura, totaleDocumento, totaleRiga, totaleRighe } from "@/lib/domain/fattura";
import { CAUSALI_FORFETTARIO } from "@/lib/domain/fatturaXml";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { nomeCliente } from "@/lib/domain/cliente";

/**
 * Copia di cortesia della fattura, impaginata per la stampa.
 *
 * Il PDF si ottiene dalla stampa del browser ("Salva come PDF"), disponibile
 * su desktop e su mobile: non viene generato lato server. È una scelta, non
 * una mancanza — un generatore PDF server-side aggiungerebbe una dipendenza
 * pesante e un runtime a sé per produrre lo stesso documento, mentre il file
 * che ha valore legale è l'XML, non questo. Vedi DECISIONS.md.
 */
export default async function PaginaStampaFattura({ params }: { params: Promise<{ id: string }> }) {
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

  const imponibile = totaleRighe(fattura.righe);
  const totale = totaleDocumento(fattura);
  const intestatario = cliente ? nomeCliente(cliente) : "—";

  return (
    <>
      <style>{`
        @media print {
          /* La chrome dell'app non deve finire sul foglio: resta solo il documento. */
          aside, details.group, .non-stampare { display: none !important; }
          main { overflow: visible !important; }
          html, body { background: #fff !important; color: #111 !important; }
          .foglio { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .foglio, .foglio * { color: #111 !important; background: transparent !important; border-color: #ccc !important; }
          @page { margin: 18mm; }
        }
      `}</style>

      <div className="flex flex-col gap-5">
        <div className="non-stampare flex flex-wrap items-center justify-between gap-3">
          <Link href={`/fatture/${fattura.id}`} className="text-xs text-ink-muted hover:text-ink">
            ← Torna al documento
          </Link>
          <p className="text-xs text-ink-faint">
            Usa la stampa del browser e scegli &quot;Salva come PDF&quot;.
          </p>
        </div>

        <article className="foglio rounded-xl border border-line bg-surface p-6 sm:p-10 flex flex-col gap-8 text-sm">
          <header className="flex flex-wrap justify-between gap-6">
            <div>
              <h1 className="text-lg font-semibold">
                {[emittente?.nome, emittente?.cognome].filter(Boolean).join(" ") || "—"}
              </h1>
              <div className="text-xs text-ink-muted mt-1 leading-relaxed">
                {emittente?.indirizzo} {emittente?.numeroCivico}
                <br />
                {emittente?.cap} {emittente?.comune} {emittente?.provincia && `(${emittente.provincia})`}
                <br />
                P.IVA {emittente?.partitaIva ?? "—"}
                {emittente?.codiceFiscale && ` · C.F. ${emittente.codiceFiscale}`}
                {emittente?.email && (
                  <>
                    <br />
                    {emittente.email}
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-ink-faint">
                {fattura.tipoDocumento === "TD04" ? "Nota di credito" : "Fattura"}
              </div>
              <div className="text-lg font-semibold">{numeroFattura(fattura)}</div>
              <div className="text-xs text-ink-muted mt-1">{formattaData(fattura.dataEmissione)}</div>
              {riferimento && (
                <div className="text-xs text-ink-muted mt-1">
                  Riferita alla fattura {numeroFattura(riferimento)} del {formattaData(riferimento.dataEmissione)}
                </div>
              )}
            </div>
          </header>

          <section className="border-t border-line pt-5">
            <div className="text-xs uppercase tracking-wide text-ink-faint mb-1">Destinatario</div>
            <div className="font-medium">{intestatario}</div>
            <div className="text-xs text-ink-muted leading-relaxed mt-0.5">
              {cliente?.indirizzo} {cliente?.numeroCivico}
              <br />
              {cliente?.cap} {cliente?.comune} {cliente?.provincia && `(${cliente.provincia})`}
              <br />
              {cliente?.partitaIva && `P.IVA ${cliente.partitaIva}`}
              {cliente?.codiceFiscale && ` · C.F. ${cliente.codiceFiscale}`}
            </div>
          </section>

          <section className="border-t border-line pt-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ink-faint border-b border-line">
                  <th className="pb-2 font-medium">Descrizione</th>
                  <th className="pb-2 font-medium text-right">Qtà</th>
                  <th className="pb-2 font-medium text-right">Prezzo</th>
                  <th className="pb-2 font-medium text-right">Totale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fattura.righe.map((riga) => (
                  <tr key={riga.id}>
                    <td className="py-2.5 pr-3">{riga.descrizione}</td>
                    <td className="py-2.5 text-right tabular-nums whitespace-nowrap">
                      {riga.quantita} {riga.unitaMisura ?? ""}
                    </td>
                    <td className="py-2.5 text-right tabular-nums whitespace-nowrap">
                      {formattaEuro(riga.prezzoUnitario)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums whitespace-nowrap">{formattaEuro(totaleRiga(riga))}</td>
                  </tr>
                ))}
                {fattura.bolloApplicato && fattura.bolloRiaddebitato && (
                  <tr>
                    <td className="py-2.5 pr-3 text-ink-muted">
                      Imposta di bollo assolta in modo virtuale ai sensi del DM 17/06/2014
                    </td>
                    <td className="py-2.5 text-right tabular-nums">1</td>
                    <td className="py-2.5 text-right tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</td>
                    <td className="py-2.5 text-right tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section className="border-t border-line pt-5 flex justify-end">
            <dl className="w-full sm:w-72 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between text-ink-muted">
                <dt>Imponibile</dt>
                <dd className="tabular-nums">{formattaEuro(imponibile)}</dd>
              </div>
              <div className="flex justify-between text-ink-muted">
                <dt>IVA</dt>
                <dd className="tabular-nums">{formattaEuro(0)}</dd>
              </div>
              {fattura.bolloApplicato && !fattura.bolloRiaddebitato && (
                <div className="flex justify-between text-ink-faint text-xs">
                  <dt>Bollo virtuale (a carico dell&apos;emittente)</dt>
                  <dd className="tabular-nums">{formattaEuro(IMPORTO_BOLLO)}</dd>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t border-line pt-2 mt-1 text-base">
                <dt>Totale documento</dt>
                <dd className="tabular-nums">{formattaEuro(totale)}</dd>
              </div>
            </dl>
          </section>

          <section className="border-t border-line pt-5 text-xs text-ink-muted flex flex-col gap-1.5">
            <p>
              Pagamento entro il {formattaData(dataScadenzaPagamento(fattura))}
              {emittente?.iban && ` — IBAN ${emittente.iban}`}
            </p>
            {fattura.causaleAggiuntiva && <p>{fattura.causaleAggiuntiva}</p>}
            <div className="text-[11px] leading-relaxed text-ink-faint mt-2 flex flex-col gap-1">
              {CAUSALI_FORFETTARIO.map((causale) => (
                <p key={causale}>{causale}</p>
              ))}
              {fattura.bolloApplicato && (
                <p>Imposta di bollo assolta in modo virtuale ai sensi del DM 17/06/2014.</p>
              )}
            </div>
          </section>
        </article>
      </div>
    </>
  );
}
