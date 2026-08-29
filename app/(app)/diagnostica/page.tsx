import { richiediUtente } from "@/lib/auth";
import { leggiLogErrori } from "@/lib/data/logErrori";
import type { Severita } from "@/lib/osservabilita/log";

const STILE_SEVERITA: Record<Severita, string> = {
  critico: "border-danger/40 bg-danger/10 text-danger",
  errore: "border-danger/30 bg-danger/5 text-danger",
  avviso: "border-warn/40 bg-warn/10 text-warn",
};

function formattaIstante(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  }).format(new Date(iso));
}

export default async function PaginaDiagnostica() {
  const { supabase, user } = await richiediUtente();
  const voci = await leggiLogErrori(supabase, user.id);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Diagnostica</h1>
        <p className="text-sm text-ink-muted">
          Gli errori che l&apos;applicazione ha incontrato, con il dettaglio tecnico che non viene mostrato nei
          messaggi a schermo. Serve a capire cosa è andato storto senza doverlo riprodurre: se qualcosa non ha
          funzionato, la causa reale è qui.
        </p>
      </div>

      {voci.length === 0 ? (
        <div className="rounded-xl border border-ok/40 bg-ok/10 px-5 py-6 text-sm text-ok">
          Nessun errore registrato. È il risultato che ci si aspetta — questa pagina è utile quando smette di
          esserlo.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {voci.map((voce) => (
            <details key={voce.id} className={`group rounded-xl border ${STILE_SEVERITA[voce.severita]}`}>
              <summary className="marker:hidden [&::-webkit-details-marker]:hidden cursor-pointer select-none px-4 py-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium">{voce.messaggio}</span>
                <span className="text-xs opacity-70 font-mono">{voce.contesto}</span>
                <span className="text-xs opacity-70 w-full">{formattaIstante(voce.quando)}</span>
              </summary>
              <div className="px-4 pb-4 flex flex-col gap-2 text-xs">
                {voce.dettaglio && (
                  <pre className="whitespace-pre-wrap break-words font-mono opacity-90 bg-surface-2 rounded-lg p-3 overflow-x-auto">
                    {voce.dettaglio}
                  </pre>
                )}
                {voce.stack && (
                  <pre className="whitespace-pre-wrap break-words font-mono opacity-70 bg-surface-2 rounded-lg p-3 overflow-x-auto">
                    {voce.stack}
                  </pre>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      <p className="text-xs text-ink-faint">
        Il log non contiene i dati dei tuoi clienti né il contenuto dei documenti: solo il punto del codice, il
        messaggio e il dettaglio tecnico dell&apos;errore.
      </p>
    </div>
  );
}
