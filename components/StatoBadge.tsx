import type { StatoFattura } from "@/lib/domain/types";

const STILE: Record<StatoFattura, { testo: string; classe: string }> = {
  bozza: { testo: "bozza", classe: "bg-surface-2 text-ink-faint border border-line" },
  emessa: { testo: "da incassare", classe: "bg-warn-soft text-warn" },
  incassata: { testo: "incassata", classe: "bg-ok-soft text-ok" },
  annullata: { testo: "annullata", classe: "bg-surface-2 text-ink-faint" },
};

export function StatoBadge({ stato }: { stato: StatoFattura }) {
  const { testo, classe } = STILE[stato];
  return <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${classe}`}>{testo}</span>;
}
