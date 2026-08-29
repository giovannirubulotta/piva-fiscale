import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiFatture, leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiClienti } from "@/lib/data/clienti";
import { numeroFattura, totaleDocumento } from "@/lib/domain/fattura";
import { AndamentoFatturato, serieAnno } from "@/components/AndamentoFatturato";
import { segnaIncassata } from "./fatture/actions";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { leggiRequisitiForfettario } from "@/lib/data/requisitiForfettario";
import { contaErroriRecenti } from "@/lib/data/logErrori";
import { calcolaRiepilogoAnno, aliquoteAnno, fatturatoIncassatoAnno } from "@/lib/domain/calcolo";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "@/lib/domain/scadenzario";
import { valutaRequisitiForfettario, valutaSoglieForfettario } from "@/lib/domain/requisitiForfettario";
import type { EsitoRequisito } from "@/lib/domain/types";
import { formattaEuro, formattaData, giorniMancanti } from "@/lib/ui/format";
import { nomeCliente } from "@/lib/domain/cliente";

export default async function Dashboard() {
  const { supabase, user } = await richiediUtente();
  const profilo = await leggiProfilo(supabase, user.id);

  if (!profilo || !profilo.dataApertura) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Benvenuto</h1>
        <p className="text-sm text-ink-muted mb-6">
          Prima di vedere calcoli e scadenze, completa il profilo fiscale: data di apertura della P.IVA,
          coefficiente di redditività e aliquota applicabile.
        </p>
        <Link
          href="/impostazioni"
          className="inline-block rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition"
        >
          Completa il profilo
        </Link>
      </div>
    );
  }

  const [tutteLeAliquote, incassi, statiScadenze, requisiti, fatture, clienti] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassiDaFatture(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
    leggiRequisitiForfettario(supabase, user.id, new Date().getFullYear()),
    leggiFatture(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);
  const erroriRecenti = await contaErroriRecenti(supabase, user.id);

  const annoCorrente = new Date().getFullYear();
  const aliquoteCorrente = aliquoteAnno(tutteLeAliquote, annoCorrente);

  if (!aliquoteCorrente) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-semibold mb-2">Aliquote mancanti</h1>
        <p className="text-sm text-ink-muted mb-6">
          Non ci sono ancora aliquote fiscali configurate. Aggiungile in Impostazioni per iniziare a vedere i calcoli.
        </p>
        <Link
          href="/impostazioni"
          className="inline-block rounded-lg bg-accent text-white text-sm font-medium px-4 py-2.5 hover:opacity-90 transition"
        >
          Vai a Impostazioni
        </Link>
      </div>
    );
  }

  const riepilogoCorrente = calcolaRiepilogoAnno(annoCorrente, incassi, profilo, aliquoteCorrente);
  const chiusi = riepiloghiAnniChiusi(incassi, profilo, tutteLeAliquote, annoCorrente);
  const scadenzeAnnuali = generaScadenzeAnnuali(chiusi);
  const scadenzeBollo = generaScadenzeBollo(incassi, annoCorrente - 1).concat(generaScadenzeBollo(incassi, annoCorrente));

  const oggi = new Date().toISOString().slice(0, 10);
  const scadenzeNonPagate = scadenzeAnnuali
    .filter((s) => !statiScadenze.get(s.chiave)?.pagato)
    .sort((a, b) => a.dataScadenza.localeCompare(b.dataScadenza));
  const prossimaScadenza = scadenzeNonPagate[0] ?? null;
  const scadenzeInRitardo = scadenzeNonPagate.filter((s) => s.dataScadenza < oggi);

  const bolloDaVersare = scadenzeBollo.reduce((sum, s) => sum + s.importoDovuto, 0);

  const esitoRequisiti = valutaRequisitiForfettario(requisiti);
  const soglia = valutaSoglieForfettario(fatturatoIncassatoAnno(incassi, annoCorrente));

  const nomiClienti = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));
  const daIncassare = fatture
    .filter((f) => f.stato === "emessa")
    .sort((a, b) => a.dataEmissione.localeCompare(b.dataEmissione));
  const totaleDaIncassare = daIncassare.reduce((somma, f) => somma + totaleDocumento(f), 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">Anno {annoCorrente}</h1>
        <p className="text-sm text-ink-muted mt-1">
          {profilo.agevolazione5Percento === null
            ? "Aliquota 15% applicata per prudenza — il diritto al 5% non è ancora stato verificato."
            : profilo.agevolazione5Percento
              ? "Aliquota agevolata 5% confermata."
              : "Aliquota standard 15%."}
        </p>
      </div>

      {scadenzeInRitardo.length > 0 && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-4">
          <p className="text-sm text-danger font-medium">
            {scadenzeInRitardo.length === 1 ? "C'è una scadenza scaduta e non segnata come pagata." : `Ci sono ${scadenzeInRitardo.length} scadenze scadute e non segnate come pagate.`}
          </p>
          <Link href="/scadenze" className="text-sm text-danger underline mt-1 inline-block">
            Vai allo scadenzario
          </Link>
        </div>
      )}

      {erroriRecenti > 0 && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-5 py-4">
          <p className="text-sm text-warn font-medium">
            {erroriRecenti === 1
              ? "Nelle ultime 24 ore l'applicazione ha incontrato un errore."
              : `Nelle ultime 24 ore l'applicazione ha incontrato ${erroriRecenti} errori.`}
          </p>
          <Link href="/diagnostica" className="text-sm text-warn underline mt-1 inline-block">
            Vedi la diagnostica
          </Link>
        </div>
      )}

      {esitoRequisiti.esitoGlobale === "escluso" && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 px-5 py-4">
          <p className="text-sm text-danger font-medium">
            Hai dichiarato una causa di esclusione dal regime forfettario: verifica con un commercialista come
            procedere.
          </p>
          <Link href="/requisiti" className="text-sm text-danger underline mt-1 inline-block">
            Vai a Requisiti regime
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Riquadro etichetta="Fatturato incassato YTD" valore={formattaEuro(riepilogoCorrente.fatturatoIncassato)} />
        <Riquadro etichetta="Imponibile stimato" valore={formattaEuro(riepilogoCorrente.imponibile)} />
        <Riquadro
          etichetta={`Imposta sostitutiva (${(riepilogoCorrente.aliquotaSostitutivaApplicata * 100).toFixed(0)}%)`}
          valore={formattaEuro(riepilogoCorrente.impostaSostitutiva)}
        />
        <Riquadro etichetta="Contributi INPS stimati" valore={formattaEuro(riepilogoCorrente.contributiInps)} />
        <Riquadro etichetta="Totale da accantonare" valore={formattaEuro(riepilogoCorrente.totaleDovuto)} accento />
        <Riquadro etichetta="Netto stimato in tasca" valore={formattaEuro(riepilogoCorrente.nettoStimato)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Prossima scadenza</div>
          {prossimaScadenza ? (
            <>
              <div className="text-lg font-medium">{prossimaScadenza.descrizione}</div>
              <div className="text-sm text-ink-muted mt-1">
                {formattaData(prossimaScadenza.dataScadenza)} · {formattaEuro(prossimaScadenza.importo)}
              </div>
              <div className="text-sm mt-2">
                {giorniMancanti(prossimaScadenza.dataScadenza) >= 0
                  ? `tra ${giorniMancanti(prossimaScadenza.dataScadenza)} giorni`
                  : `${Math.abs(giorniMancanti(prossimaScadenza.dataScadenza))} giorni di ritardo`}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">
              {riepilogoCorrente.primoAnno
                ? "Primo anno di attività: nessuna scadenza dovuta finché l'anno non si chiude."
                : "Nessuna scadenza in sospeso al momento."}
            </p>
          )}
          <Link href="/scadenze" className="text-sm text-accent hover:underline mt-3 inline-block">
            Vedi tutto lo scadenzario →
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Bollo virtuale da versare</div>
          <div className="text-lg font-medium">{formattaEuro(bolloDaVersare)}</div>
          <p className="text-sm text-ink-muted mt-1">
            Su fatture senza IVA sopra 77,47 €, cumulato sugli ultimi due trimestri tracciati.
          </p>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <div className="text-xs text-ink-muted uppercase tracking-wide mb-2">Requisiti regime forfettario</div>
          <div className={`text-lg font-medium ${TESTO_ESITO[esitoRequisiti.esitoGlobale]}`}>
            {TITOLO_ESITO[esitoRequisiti.esitoGlobale]}
          </div>
          <p className="text-sm text-ink-muted mt-1">{soglia.messaggio}</p>
          <Link href="/requisiti" className="text-sm text-accent hover:underline mt-2 inline-block">
            Vai a Requisiti regime →
          </Link>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Fatture da incassare</h2>
          <Link href="/fatture" className="text-sm text-accent hover:underline">
            Tutte le fatture →
          </Link>
        </div>
        {daIncassare.length === 0 ? (
          <div className="rounded-xl border border-line bg-surface px-5 py-6 text-center">
            <p className="text-sm text-ink-muted mb-3">Nessuna fattura in attesa di incasso.</p>
            <Link href="/fatture/nuova" className="text-sm text-accent hover:underline">
              Emetti una fattura →
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="px-5 py-3 border-b border-line bg-accent-soft/40 text-sm text-accent">
              {daIncassare.length === 1
                ? `C'è 1 fattura da incassare per un totale di ${formattaEuro(totaleDaIncassare)}`
                : `Ci sono ${daIncassare.length} fatture da incassare per un totale di ${formattaEuro(totaleDaIncassare)}`}
            </div>
            <div className="divide-y divide-line">
              {daIncassare.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <Link href={`/fatture/${f.id}`} className="min-w-0 flex-1 hover:text-accent transition">
                    <div className="font-medium truncate">{nomiClienti.get(f.clienteId) ?? "—"}</div>
                    <div className="text-xs text-ink-faint">
                      {numeroFattura(f)} · {formattaData(f.dataEmissione)}
                    </div>
                  </Link>
                  <div className="tabular-nums shrink-0">{formattaEuro(totaleDocumento(f))}</div>
                  <form action={segnaIncassata} className="shrink-0">
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="btn-primario text-xs px-3 py-1.5">
                      Incassa
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <AndamentoFatturato serie={[serieAnno(incassi, annoCorrente), serieAnno(incassi, annoCorrente - 1)]} />

    </div>
  );
}

const TITOLO_ESITO: Record<EsitoRequisito, string> = {
  ok: "Nessuna causa dichiarata",
  da_verificare: "Da verificare",
  escluso: "Causa di esclusione dichiarata",
};

const TESTO_ESITO: Record<EsitoRequisito, string> = {
  ok: "text-ok",
  da_verificare: "text-warn",
  escluso: "text-danger",
};

function Riquadro({ etichetta, valore, accento }: { etichetta: string; valore: string; accento?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted mb-1.5">{etichetta}</div>
      <div className={`text-lg font-semibold ${accento ? "text-accent" : "text-ink"}`}>{valore}</div>
    </div>
  );
}

