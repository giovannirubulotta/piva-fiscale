import Link from "next/link";
import { notFound } from "next/navigation";
import { richiediUtente } from "@/lib/auth";
import { leggiPreventivo } from "@/lib/data/preventivi";
import { leggiCliente } from "@/lib/data/clienti";
import { nomeCliente } from "@/lib/domain/cliente";
import {
  ETICHETTE_STATO,
  giorniDiValidita,
  motivoNonConvertibile,
  numeroPreventivo,
  statoEffettivo,
  totalePreventivo,
} from "@/lib/domain/preventivo";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { IntestazionePagina, Scheda } from "@/components/Pagina";
import { cambiaStato, convertiInFattura, rimuoviPreventivo } from "../actions";

export default async function PaginaPreventivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await richiediUtente();

  const preventivo = await leggiPreventivo(supabase, user.id, id);
  if (!preventivo) notFound();

  const cliente = await leggiCliente(supabase, user.id, preventivo.clienteId);
  const oggi = new Date().toISOString().slice(0, 10);
  const stato = statoEffettivo(preventivo, oggi);
  const giorni = giorniDiValidita(preventivo, oggi);
  const nonConvertibile = motivoNonConvertibile(preventivo);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <IntestazionePagina
        ritorno={{ href: "/preventivi", testo: "Preventivi" }}
        titolo={`Preventivo ${numeroPreventivo(preventivo)}`}
        descrizione={[
          cliente ? nomeCliente(cliente) : "—",
          preventivo.oggetto,
          `${ETICHETTE_STATO[stato]} · valido fino al ${formattaData(preventivo.validoFinoAl)}`,
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <div className="flex flex-wrap gap-2">
        {preventivo.stato === "bozza" && (
          <FormaStato id={preventivo.id} stato="inviato" etichetta="Segna inviato" primario />
        )}
        {preventivo.stato === "inviato" && (
          <>
            <FormaStato id={preventivo.id} stato="accettato" etichetta="Accettato" primario />
            <FormaStato id={preventivo.id} stato="rifiutato" etichetta="Rifiutato" />
          </>
        )}
        {nonConvertibile === null && (
          <form action={convertiInFattura}>
            <input type="hidden" name="id" value={preventivo.id} />
            <button type="submit" className="btn-primario">
              Trasforma in fattura
            </button>
          </form>
        )}
        {preventivo.fatturaId && (
          <Link href={`/fatture/${preventivo.fatturaId}`} className="btn-secondario">
            Vai alla fattura
          </Link>
        )}
      </div>

      {stato === "scaduto" && (
        <div className="rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
          L&apos;offerta è scaduta il {formattaData(preventivo.validoFinoAl)}, {Math.abs(giorni)}{" "}
          {Math.abs(giorni) === 1 ? "giorno" : "giorni"} fa, e non ha ancora ricevuto risposta. Uno scaduto non è un
          rifiuto: è un silenzio, e di solito basta richiamare.
        </div>
      )}

      {nonConvertibile && preventivo.stato !== "bozza" && (
        <p className="text-sm text-ink-muted">{nonConvertibile}</p>
      )}

      <Scheda titolo="Righe">
        <div className="divide-y divide-line">
          {preventivo.righe.map((riga) => (
            <div key={riga.id} className="px-4 sm:px-5 py-3 flex items-baseline justify-between gap-4 text-sm">
              <div className="min-w-0">
                <div>{riga.descrizione}</div>
                <div className="text-xs text-ink-faint">
                  {riga.quantita} {riga.unitaMisura ?? ""} × {formattaEuro(riga.prezzoUnitario)}
                </div>
              </div>
              <div className="shrink-0 tabular-nums">
                {formattaEuro(Math.round(Math.round(riga.prezzoUnitario * 100) * riga.quantita) / 100)}
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 sm:px-5 py-4 border-t border-line bg-surface-2 flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Totale</span>
          <span className="text-lg font-semibold tabular-nums text-accent">
            {formattaEuro(totalePreventivo(preventivo))}
          </span>
        </div>
      </Scheda>

      {preventivo.condizioni && (
        <Scheda titolo="Condizioni">
          <p className="px-4 sm:px-5 py-4 text-sm whitespace-pre-wrap">{preventivo.condizioni}</p>
        </Scheda>
      )}

      {preventivo.note && <p className="text-xs text-ink-faint">Note interne: {preventivo.note}</p>}

      <p className="text-xs text-ink-faint">
        Un preventivo non è un documento fiscale: non ha bollo né natura IVA, e la sua numerazione è separata da
        quella delle fatture, che è vincolata e i cui numeri non si riusano.
      </p>

      <form action={rimuoviPreventivo} className="pt-2 border-t border-line">
        <input type="hidden" name="id" value={preventivo.id} />
        <button type="submit" className="text-xs text-danger hover:underline">
          elimina preventivo
        </button>
      </form>
    </div>
  );
}

function FormaStato({
  id,
  stato,
  etichetta,
  primario,
}: {
  id: string;
  stato: string;
  etichetta: string;
  primario?: boolean;
}) {
  return (
    <form action={cambiaStato}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="stato" value={stato} />
      <button type="submit" className={primario ? "btn-primario" : "btn-secondario"}>
        {etichetta}
      </button>
    </form>
  );
}
