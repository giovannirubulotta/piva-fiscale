import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiIncassi } from "@/lib/data/incassi";
import { leggiStatiScadenze } from "@/lib/data/scadenzeStato";
import { calcolaRiepilogoAnno, aliquoteAnno } from "@/lib/domain/calcolo";
import { riepiloghiAnniChiusi } from "@/lib/domain/orchestrazione";
import { generaScadenzeAnnuali, generaScadenzeBollo } from "@/lib/domain/scadenzario";
import { formattaEuro, formattaData, giorniMancanti } from "@/lib/ui/format";

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

  const [tutteLeAliquote, incassi, statiScadenze] = await Promise.all([
    leggiAliquote(supabase),
    leggiIncassi(supabase, user.id),
    leggiStatiScadenze(supabase, user.id),
  ]);

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

  const ultimiIncassi = [...incassi]
    .sort((a, b) => (b.dataIncasso ?? b.dataEmissione).localeCompare(a.dataIncasso ?? a.dataEmissione))
    .slice(0, 5);

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

      <div className="grid md:grid-cols-2 gap-4">
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
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Ultimi incassi</h2>
          <Link href="/incassi" className="text-sm text-accent hover:underline">
            Gestisci incassi →
          </Link>
        </div>
        {ultimiIncassi.length === 0 ? (
          <p className="text-sm text-ink-muted">Nessun incasso registrato ancora.</p>
        ) : (
          <div className="rounded-xl border border-line bg-surface divide-y divide-line">
            {ultimiIncassi.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div>
                  <div className="text-ink">{formattaEuro(i.importoNetto)}</div>
                  <div className="text-ink-faint text-xs">{formattaData(i.dataIncasso ?? i.dataEmissione)}</div>
                </div>
                <StatoBadge stato={i.stato} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Riquadro({ etichetta, valore, accento }: { etichetta: string; valore: string; accento?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs text-ink-muted mb-1.5">{etichetta}</div>
      <div className={`text-lg font-semibold ${accento ? "text-accent" : "text-ink"}`}>{valore}</div>
    </div>
  );
}

function StatoBadge({ stato }: { stato: "da_incassare" | "incassata" | "annullata" }) {
  const mappa = {
    da_incassare: { testo: "da incassare", classe: "bg-warn-soft text-warn" },
    incassata: { testo: "incassata", classe: "bg-ok-soft text-ok" },
    annullata: { testo: "annullata", classe: "bg-surface-2 text-ink-faint" },
  } as const;
  const { testo, classe } = mappa[stato];
  return <span className={`text-xs px-2 py-1 rounded-full ${classe}`}>{testo}</span>;
}
