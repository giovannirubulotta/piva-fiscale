import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { leggiCreditiDisponibili } from "@/lib/data/creditiDisponibili";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "@/lib/domain/scadenzario";
import { generaModuliF24, type SezioneF24 } from "@/lib/domain/f24";
import { riepilogoCompensazioni, saldoDisponibile, SOGLIA_VISTO_CONFORMITA } from "@/lib/domain/compensazioni";
import type { TipologiaCredito } from "@/lib/domain/types";
import { formattaEuro, formattaData } from "@/lib/ui/format";
import { NuovoCreditoForm } from "./NuovoCreditoForm";
import { annullaUtilizzoCredito, rimuoviCredito, utilizzaCredito } from "./actions";

const ETICHETTA_SEZIONE: Record<SezioneF24, string> = {
  erario: "Erario",
  inps: "INPS",
};

const ETICHETTA_TIPOLOGIA: Record<TipologiaCredito, string> = {
  irpef: "IRPEF / addizionali",
  imposta_sostitutiva: "Imposta sostitutiva forfettaria",
  inps: "Contributi INPS",
  irap: "IRAP",
  altro: "Altro",
};

export default async function PaginaF24() {
  const { supabase, user } = await richiediUtente();
  const profilo = await leggiProfilo(supabase, user.id);

  if (!profilo || !profilo.dataApertura) {
    return <p className="text-sm text-ink-muted">Completa prima il profilo in Impostazioni.</p>;
  }

  const [tutteLeAliquote, incassi, statiScadenze, crediti] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassiDaFatture(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
    leggiCreditiDisponibili(supabase, user.id),
  ]);

  const annoCorrente = new Date().getFullYear();
  const chiusi = riepiloghiAnniChiusi(incassi, profilo, tutteLeAliquote, annoCorrente);
  const scadenzeAnnuali = generaScadenzeAnnuali(chiusi).filter((s) => !statiScadenze.get(s.chiave)?.pagato);

  const anniConIncassi = new Set(incassi.map((i) => new Date(i.dataEmissione).getFullYear()));
  const scadenzeBollo = [...anniConIncassi]
    .flatMap((anno) => generaScadenzeBollo(incassi, anno))
    .filter((s) => s.importoDovuto > 0 && !statiScadenze.get(s.chiave)?.pagato);

  const moduli = generaModuliF24(scadenzeAnnuali, scadenzeBollo);
  const riepilogo = riepilogoCompensazioni(crediti);
  const saldo = saldoDisponibile(crediti);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold mb-1">Genera F24</h1>
        <p className="text-sm text-ink-muted">
          Righe pronte da ricopiare sul modello F24 per ogni scadenza non ancora segnata come pagata, raggruppate per
          data di versamento. Questo generatore non trasmette nulla all&apos;Agenzia delle Entrate: prepara solo i
          dati da riportare, a mano o tramite il servizio di home banking/intermediario che usi per il pagamento.
        </p>
      </div>

      {moduli.length === 0 ? (
        <p className="text-sm text-ink-muted">Nessuna scadenza da versare al momento.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {moduli.map((modulo) => (
            <div key={modulo.dataScadenza} className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-line bg-surface-2">
                <div>
                  <div className="text-xs text-ink-muted uppercase tracking-wide">Scadenza di versamento</div>
                  <div className="text-lg font-medium">{formattaData(modulo.dataScadenza)}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ink-muted uppercase tracking-wide">Totale modulo</div>
                  <div className="text-lg font-medium">{formattaEuro(modulo.totale)}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
                      <th className="px-4 py-2.5 font-medium">Sezione</th>
                      <th className="px-4 py-2.5 font-medium">Codice tributo</th>
                      <th className="px-4 py-2.5 font-medium">Anno rif.</th>
                      <th className="px-4 py-2.5 font-medium">Rateazione</th>
                      <th className="px-4 py-2.5 font-medium text-right">Importo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {modulo.righe.map((riga) => (
                      <tr key={riga.chiaveScadenza}>
                        <td className="px-4 py-2.5">{ETICHETTA_SEZIONE[riga.sezione]}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">{riga.codiceTributo}</td>
                        <td className="px-4 py-2.5">{riga.annoRiferimento}</td>
                        <td className="px-4 py-2.5 font-mono text-xs">
                          {riga.rateazione ?? <span className="text-ink-faint font-sans">in bianco</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right">{formattaEuro(riga.importo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-line text-xs text-ink-faint flex flex-col gap-1">
                {modulo.righe.map((riga) => (
                  <div key={riga.chiaveScadenza}>{riga.descrizione}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-2 px-5 py-4 text-xs text-ink-muted flex flex-col gap-1.5">
        <p>
          Il campo &quot;rateazione&quot; segue la convenzione generale NNRR del modello F24 (rata corrente/rate
          totali: es. &quot;0102&quot; = prima di due rate, &quot;0101&quot; = rata unica). Verifica sempre i codici
          tributo e il valore esatto di questo campo sul sito dell&apos;Agenzia delle Entrate o con il tuo
          intermediario prima dell&apos;invio, specialmente in caso di ravvedimento operoso o rateazioni concorrenti
          con altri tributi.
        </p>
        <p>
          Il codice ufficio e il codice atto vanno lasciati in bianco per questi versamenti. Il segno da indicare
          nella colonna &quot;importi a debito versati&quot; è sempre &quot;+&quot;.
        </p>
      </div>

      <section className="flex flex-col gap-4 pt-4 border-t border-line">
        <div>
          <h2 className="text-lg font-semibold mb-1">Compensazione: crediti disponibili</h2>
          <p className="text-sm text-ink-muted">
            Registro dei crediti fiscali utilizzabili in compensazione orizzontale nell&apos;F24 (es. eccedenza da
            LM47 del Modello Redditi, ritenute subite). Saldo non ancora utilizzato:{" "}
            <span className="text-ink font-medium">{formattaEuro(saldo)}</span>.
          </p>
        </div>

        {riepilogo.some((r) => r.richiedeVistoConformita) && (
          <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn flex flex-col gap-1.5">
            <p className="font-medium">Serve il visto di conformità di un professionista abilitato</p>
            {riepilogo
              .filter((r) => r.richiedeVistoConformita)
              .map((r) => (
                <p key={`${r.tipologia}-${r.anno}`}>
                  {ETICHETTA_TIPOLOGIA[r.tipologia]}, anno {r.anno}: {formattaEuro(r.totaleUtilizzato)} compensati,
                  sopra la soglia di {formattaEuro(SOGLIA_VISTO_CONFORMITA)}.
                </p>
              ))}
            <p className="text-xs text-warn/80">
              Sopra 5.000 € annui per singola tipologia di credito, la compensazione orizzontale in F24 richiede per
              legge il visto di conformità di un intermediario abilitato (commercialista, consulente del lavoro,
              CAF, revisore legale): il contribuente non può attestarlo da solo, indipendentemente da quanto sia
              informato — non è un limite di competenza, è un atto riservato per legge. Rif. art. 1 c. 574 L.
              147/2013.
            </p>
          </div>
        )}

        <NuovoCreditoForm />

        <div className="rounded-xl border border-line bg-surface overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
                <th className="px-4 py-3 font-medium">Tipologia</th>
                <th className="px-4 py-3 font-medium">Anno maturazione</th>
                <th className="px-4 py-3 font-medium text-right">Importo</th>
                <th className="px-4 py-3 font-medium">Stato</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {crediti.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-muted">
                    Nessun credito registrato ancora.
                  </td>
                </tr>
              )}
              {crediti.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">{ETICHETTA_TIPOLOGIA[c.tipologia]}</td>
                  <td className="px-4 py-3 text-ink-muted">{c.annoMaturazione}</td>
                  <td className="px-4 py-3 text-right">{formattaEuro(c.importo)}</td>
                  <td className="px-4 py-3 text-ink-muted">
                    {c.utilizzato ? `utilizzato (${c.annoUtilizzo})` : "disponibile"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      {c.utilizzato ? (
                        <form action={annullaUtilizzoCredito}>
                          <input type="hidden" name="id" value={c.id} />
                          <button type="submit" className="text-xs text-accent hover:underline">
                            annulla utilizzo
                          </button>
                        </form>
                      ) : (
                        <form action={utilizzaCredito} className="flex items-center gap-1.5">
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="number"
                            name="annoUtilizzo"
                            defaultValue={annoCorrente}
                            className="campo-input w-20 py-1 text-xs"
                          />
                          <button type="submit" className="text-xs text-accent hover:underline">
                            segna utilizzato
                          </button>
                        </form>
                      )}
                      <form action={rimuoviCredito}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="text-xs text-danger hover:underline">
                          elimina
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
