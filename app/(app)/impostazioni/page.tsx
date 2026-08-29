import { richiediUtente } from "@/lib/auth";
import { leggiDatiEmittente, leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { leggiCoefficientiAteco } from "@/lib/data/coefficientiAteco";
import { aliquoteAnno } from "@/lib/domain/calcolo";
import { ProfiloForm } from "./ProfiloForm";
import { AliquoteForm } from "./AliquoteForm";
import { EmittenteForm } from "./EmittenteForm";

export default async function PaginaImpostazioni() {
  const { supabase, user } = await richiediUtente();
  const [profilo, tutteLeAliquote, coefficientiAteco, emittente] = await Promise.all([
    leggiProfilo(supabase, user.id),
    leggiAliquote(supabase),
    leggiCoefficientiAteco(supabase),
    leggiDatiEmittente(supabase, user.id),
  ]);

  const annoCorrente = new Date().getFullYear();
  const aliquoteCorrente = aliquoteAnno(tutteLeAliquote, annoCorrente);

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Impostazioni</h1>
        <p className="text-sm text-ink-muted">
          Parametri del tuo profilo fiscale e aliquote in vigore. Le aliquote cambiano quasi ogni anno con la legge
          di bilancio: aggiornale qui, non c&apos;è bisogno di ritoccare il codice. Il coefficiente di redditività si
          compila da solo appena scrivi il codice ATECO, in base alla tabella ufficiale (Allegato 4 L. 190/2014).
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Profilo</h2>
        <ProfiloForm profilo={profilo} coefficientiAteco={coefficientiAteco} />
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Dati per la fatturazione</h2>
          <p className="text-xs text-ink-faint mt-1">
            Compaiono in fattura e nel file XML per lo SDI. Finché sono incompleti puoi comunque emettere documenti,
            ma non generare l&apos;XML da trasmettere.
          </p>
        </div>
        <EmittenteForm emittente={emittente} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">
          Aliquote {annoCorrente}
          {!aliquoteCorrente && <span className="text-warn normal-case font-normal"> — non ancora configurate</span>}
        </h2>
        <AliquoteForm anno={annoCorrente} aliquote={aliquoteCorrente} />
      </section>
    </div>
  );
}
