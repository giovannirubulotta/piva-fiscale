import { richiediUtente } from "@/lib/auth";
import { leggiProfilo } from "@/lib/data/profilo";
import { leggiAliquote } from "@/lib/data/aliquote";
import { aliquoteAnno } from "@/lib/domain/calcolo";
import { ProfiloForm } from "./ProfiloForm";
import { AliquoteForm } from "./AliquoteForm";

export default async function PaginaImpostazioni() {
  const { supabase, user } = await richiediUtente();
  const [profilo, tutteLeAliquote] = await Promise.all([leggiProfilo(supabase, user.id), leggiAliquote(supabase)]);

  const annoCorrente = new Date().getFullYear();
  const aliquoteCorrente = aliquoteAnno(tutteLeAliquote, annoCorrente);

  return (
    <div className="flex flex-col gap-10 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold mb-1">Impostazioni</h1>
        <p className="text-sm text-ink-muted">
          Parametri del tuo profilo fiscale e aliquote in vigore. Le aliquote cambiano quasi ogni anno con la legge
          di bilancio: aggiornale qui, non c&apos;è bisogno di ritoccare il codice.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium text-ink-muted uppercase tracking-wide">Profilo</h2>
        <ProfiloForm profilo={profilo} />
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
