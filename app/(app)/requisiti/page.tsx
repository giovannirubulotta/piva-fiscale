import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiIncassiDaFatture } from "@/lib/data/fatture";
import { leggiRequisitiForfettario } from "@/lib/data/requisitiForfettario";
import { fatturatoIncassatoAnno } from "@/lib/domain/calcolo";
import { valutaSoglieForfettario } from "@/lib/domain/requisitiForfettario";
import { formattaEuro } from "@/lib/ui/format";
import { RequisitiForm } from "./RequisitiForm";

const STILE_SOGLIA = {
  sotto_permanenza: "border-ok/40 bg-ok/10 text-ok",
  sopra_permanenza: "border-warn/40 bg-warn/10 text-warn",
  sopra_uscita_immediata: "border-danger/40 bg-danger/10 text-danger",
} as const;

export default async function PaginaRequisiti() {
  const { supabase, user } = await richiediUtente();

  if (!(await leggiProfilo(supabase, user.id))?.dataApertura) {
    return <p className="text-sm text-ink-muted">Completa prima il profilo in Impostazioni.</p>;
  }

  const [incassi, requisiti] = await Promise.all([
    leggiIncassiDaFatture(supabase, user.id),
    leggiRequisitiForfettario(supabase, user.id, new Date().getFullYear()),
  ]);

  const annoCorrente = new Date().getFullYear();
  const fatturato = fatturatoIncassatoAnno(incassi, annoCorrente);
  const soglia = valutaSoglieForfettario(fatturato);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Requisiti regime forfettario</h1>
        <p className="text-sm text-ink-muted">
          Autovalutazione delle condizioni che, se presenti, ti escludono dal regime forfettario. Non sostituisce una
          verifica con un commercialista nei casi limite: registra solo cosa hai dichiarato di aver controllato.
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Soglia di fatturato {annoCorrente}</h2>
        <div className={`rounded-xl border px-4 py-3 text-sm ${STILE_SOGLIA[soglia.esito]}`}>
          <div className="font-medium">{formattaEuro(soglia.fatturatoIncassato)} incassati finora</div>
          <div className="mt-1">{soglia.messaggio}</div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
          Cause di esclusione soggettive {annoCorrente}
        </h2>
        <RequisitiForm anno={annoCorrente} requisiti={requisiti} />
      </section>
    </div>
  );
}
