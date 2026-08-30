import { SOGLIA_PERMANENZA } from "@/lib/domain/requisitiForfettario";
import type { Previsione } from "@/lib/domain/previsione";
import { formattaEuro } from "@/lib/ui/format";

/**
 * Dove finirà l'anno, e quanto va messo da parte perché finisca bene.
 *
 * Il numero grande è il totale dovuto nello scenario **prudente**, non nello
 * scenario ottimista: un accantonamento va dimensionato su ciò che è certo, e
 * un numero previsionale mostrato in grande viene letto come un dato. La forbice
 * fino allo scenario a ritmo attuale sta accanto, dichiarata come ipotesi.
 *
 * La barra non è decorazione: mostra da cosa è composto il fatturato previsto —
 * incassato, emesso non ancora pagato, atteso — perché le tre parti hanno gradi
 * di certezza diversi e vanno distinte a colpo d'occhio.
 */
export function PrevisioneAnno({ previsione }: { previsione: Previsione }) {
  const prudente = previsione.scenari.find((s) => s.chiave === "prudente");
  const ritmo = previsione.scenari.find((s) => s.chiave === "ritmo");
  if (!prudente || !ritmo) return null;

  const atteso = Math.max(0, ritmo.fatturatoPrevisto - prudente.fatturatoPrevisto);

  // La soglia degli 85.000 € entra nella scala solo quando è a portata: con un
  // fatturato previsto di 12.000 € una barra piena al 14% non informa, allarma
  // per nulla e schiaccia le tre componenti in una striscia illeggibile.
  const soglieRilevante = ritmo.fatturatoPrevisto > SOGLIA_PERMANENZA * 0.6;
  const scala = Math.max(soglieRilevante ? SOGLIA_PERMANENZA : 0, ritmo.fatturatoPrevisto, 1);

  const quota = (valore: number) => `${(valore / scala) * 100}%`;

  const segmenti = [
    { chiave: "incassato", etichetta: "Incassato", valore: previsione.incassatoAdOggi, classe: "bg-ok" },
    { chiave: "emesso", etichetta: "Emesso, non ancora incassato", valore: previsione.emessoDaIncassare, classe: "bg-accent" },
    { chiave: "atteso", etichetta: "Atteso al ritmo attuale", valore: atteso, classe: "bg-accent/30" },
  ].filter((s) => s.valore > 0);

  return (
    <section className="rounded-xl border border-line bg-surface p-5 sm:p-6 flex flex-col gap-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <h2 className="text-xs text-ink-muted uppercase tracking-wide">
            Da accantonare per chiudere l&apos;anno {previsione.anno}
          </h2>
          <p className="text-3xl font-semibold mt-1.5 tabular-nums">
            {formattaEuro(prudente.riepilogo.totaleDovuto)}
          </p>
          <p className="text-sm text-ink-muted mt-1">
            su un fatturato di {formattaEuro(prudente.fatturatoPrevisto)} — {prudente.ipotesi.toLowerCase()}
          </p>
        </div>

        {ritmo.fatturatoPrevisto > prudente.fatturatoPrevisto && (
          <div className="text-right">
            <div className="text-xs text-ink-muted uppercase tracking-wide">Se il ritmo tiene</div>
            <p className="text-xl font-medium mt-1 tabular-nums text-ink">
              {formattaEuro(ritmo.riepilogo.totaleDovuto)}
            </p>
            <p className="text-xs text-ink-faint mt-1 max-w-[22rem]">{ritmo.ipotesi}</p>
          </div>
        )}
      </div>

      <div>
        <div className="flex gap-0.5 h-3" role="img" aria-label={descrizioneBarra(previsione, atteso)}>
          {segmenti.map((s) => (
            <div
              key={s.chiave}
              className={`${s.classe} first:rounded-l-full last:rounded-r-full`}
              style={{ width: quota(s.valore) }}
              title={`${s.etichetta}: ${formattaEuro(s.valore)}`}
            />
          ))}
          {soglieRilevante && (
            <div className="flex-1 rounded-r-full bg-surface-2" title="Margine fino alla soglia di 85.000 €" />
          )}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-ink-muted">
          {segmenti.map((s) => (
            <span key={s.chiave} className="inline-flex items-center gap-1.5">
              <span className={`${s.classe} w-2.5 h-2.5 rounded-sm shrink-0`} aria-hidden="true" />
              {s.etichetta} <span className="tabular-nums text-ink">{formattaEuro(s.valore)}</span>
            </span>
          ))}
          {soglieRilevante && (
            <span className="inline-flex items-center gap-1.5 text-warn">
              Soglia forfettario <span className="tabular-nums">{formattaEuro(SOGLIA_PERMANENZA)}</span>
            </span>
          )}
        </div>
      </div>

      {ritmo.soglie.esito !== "sotto_permanenza" && (
        <p className="text-sm text-warn border-t border-line pt-4">{ritmo.soglie.messaggio}</p>
      )}

      {previsione.troppoPrestoPerProiettare && (
        <p className="text-sm text-ink-faint border-t border-line pt-4">
          {ritmo.ipotesi} Per ora vale solo ciò che è già certo.
        </p>
      )}
    </section>
  );
}

function descrizioneBarra(previsione: Previsione, atteso: number): string {
  const parti = [
    `incassato ${formattaEuro(previsione.incassatoAdOggi)}`,
    `emesso e non ancora incassato ${formattaEuro(previsione.emessoDaIncassare)}`,
  ];
  if (atteso > 0) parti.push(`atteso al ritmo attuale ${formattaEuro(atteso)}`);
  return `Composizione del fatturato previsto: ${parti.join(", ")}.`;
}
