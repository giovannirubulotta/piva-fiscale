import { formattaEuro } from "@/lib/ui/format";

const MESI = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export interface SerieAnno {
  anno: number;
  /** 12 valori, uno per mese, in euro. */
  mensili: number[];
  totale: number;
}

/**
 * Andamento del fatturato incassato, mese per mese, con l'anno precedente a
 * confronto. SVG inline invece di una libreria di grafici: due serie da dodici
 * punti non giustificano un runtime di charting nel bundle, e così il grafico
 * resta renderizzato dal server, leggibile anche prima che il JS sia attivo.
 */
export function AndamentoFatturato({ serie }: { serie: SerieAnno[] }) {
  const massimo = Math.max(1, ...serie.flatMap((s) => s.mensili));
  const larghezza = 720;
  const altezza = 220;
  const margineSinistro = 8;
  const margineBasso = 24;
  const passo = (larghezza - margineSinistro * 2) / 11;
  const utile = altezza - margineBasso - 10;

  const colori = ["var(--accent)", "var(--ink-faint)"];

  function punti(mensili: number[]): string {
    return mensili
      .map((valore, i) => {
        const x = margineSinistro + i * passo;
        const y = 10 + utile - (valore / massimo) * utile;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Andamento del fatturato</h2>
        <div className="flex flex-wrap gap-4 text-xs">
          {serie.map((s, i) => (
            <span key={s.anno} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: colori[i] }} aria-hidden />
              <span className="text-ink-muted">{s.anno}</span>
              <span className="text-ink tabular-nums">{formattaEuro(s.totale)}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${larghezza} ${altezza}`}
          className="w-full min-w-[420px] h-48"
          role="img"
          aria-label={`Fatturato incassato per mese: ${serie
            .map((s) => `${s.anno} ${formattaEuro(s.totale)}`)
            .join(", ")}`}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((frazione) => (
            <line
              key={frazione}
              x1={margineSinistro}
              x2={larghezza - margineSinistro}
              y1={10 + utile * frazione}
              y2={10 + utile * frazione}
              stroke="var(--line)"
              strokeWidth="1"
            />
          ))}

          {serie.map((s, i) => (
            <g key={s.anno}>
              <polyline
                points={punti(s.mensili)}
                fill="none"
                stroke={colori[i]}
                strokeWidth={i === 0 ? 2.5 : 1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={i === 0 ? undefined : "4 4"}
              />
              {i === 0 &&
                s.mensili.map((valore, m) =>
                  valore > 0 ? (
                    <circle
                      key={m}
                      cx={margineSinistro + m * passo}
                      cy={10 + utile - (valore / massimo) * utile}
                      r="3"
                      fill={colori[i]}
                    />
                  ) : null
                )}
            </g>
          ))}

          {MESI.map((mese, i) => (
            <text
              key={mese}
              x={margineSinistro + i * passo}
              y={altezza - 6}
              textAnchor="middle"
              fontSize="11"
              fill="var(--ink-faint)"
            >
              {mese}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

/** Aggrega gli incassi per mese dell'anno indicato. Conta la data di incasso: il forfettario tassa per cassa. */
export function serieAnno(
  incassi: { dataIncasso: string | null; importoNetto: number; stato: string }[],
  anno: number
): SerieAnno {
  const mensili = Array<number>(12).fill(0);
  for (const incasso of incassi) {
    if (incasso.stato !== "incassata" || !incasso.dataIncasso) continue;
    if (Number(incasso.dataIncasso.slice(0, 4)) !== anno) continue;
    const mese = Number(incasso.dataIncasso.slice(5, 7)) - 1;
    mensili[mese] += incasso.importoNetto;
  }
  return { anno, mensili, totale: Math.round(mensili.reduce((a, b) => a + b, 0) * 100) / 100 };
}
