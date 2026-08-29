import Link from "next/link";
import { richiediUtente } from "@/lib/auth";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { numeroFattura, totaleDocumento } from "@/lib/domain/fattura";
import { formattaData, formattaEuro } from "@/lib/ui/format";
import { StatoBadge } from "@/components/StatoBadge";

export default async function PaginaFatture() {
  const { supabase, user } = await richiediUtente();
  const [fatture, clienti] = await Promise.all([
    leggiFatture(supabase, user.id),
    leggiClienti(supabase, user.id),
  ]);

  const nomeCliente = new Map(
    clienti.map((c) => [c.id, (c.denominazione ?? [c.nome, c.cognome].filter(Boolean).join(" ")) || "Senza nome"])
  );

  const daIncassare = fatture.filter((f) => f.stato === "emessa");
  const totaleDaIncassare = daIncassare.reduce((somma, f) => somma + totaleDocumento(f), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold mb-1">Fatture</h1>
          <p className="text-sm text-ink-muted">
            {fatture.length === 0
              ? "Nessun documento emesso ancora."
              : `${fatture.length} ${fatture.length === 1 ? "documento" : "documenti"}${
                  daIncassare.length > 0 ? ` · ${formattaEuro(totaleDaIncassare)} da incassare` : ""
                }`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/clienti" className="btn-secondario">
            Clienti
          </Link>
          <Link href="/fatture/nuova" className="btn-primario">
            Nuova fattura
          </Link>
        </div>
      </div>

      {fatture.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-5 py-10 text-center">
          <p className="text-sm text-ink-muted mb-4">
            Da qui emetti fatture e note di credito, con il file XML pronto da caricare sul portale
            dell&apos;Agenzia delle Entrate.
          </p>
          <Link href="/fatture/nuova" className="btn-primario inline-block">
            Crea la prima fattura
          </Link>
        </div>
      ) : (
        <>
          {/* Mobile: schede toccabili per intero */}
          <div className="flex flex-col gap-3 md:hidden">
            {fatture.map((f) => (
              <Link
                key={f.id}
                href={`/fatture/${f.id}`}
                className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-2 active:bg-surface-2 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {f.tipoDocumento === "TD04" && <span className="text-ink-faint">NC </span>}
                      {numeroFattura(f)}
                    </div>
                    <div className="text-xs text-ink-muted truncate">{nomeCliente.get(f.clienteId) ?? "—"}</div>
                  </div>
                  <StatoBadge stato={f.stato} />
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-ink-faint">{formattaData(f.dataEmissione)}</span>
                  <span className={`font-medium tabular-nums ${f.tipoDocumento === "TD04" ? "text-danger" : ""}`}>
                    {f.tipoDocumento === "TD04" ? "−" : ""}
                    {formattaEuro(totaleDocumento(f))}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: tabella */}
          <div className="hidden md:block rounded-xl border border-line bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
                  <th className="px-4 py-3 font-medium">Numero</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium text-right">Totale</th>
                  <th className="px-4 py-3 font-medium">Stato</th>
                  <th className="px-4 py-3 font-medium">XML</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {fatture.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-2 transition">
                    <td className="px-4 py-3">
                      <Link href={`/fatture/${f.id}`} className="font-medium hover:text-accent">
                        {f.tipoDocumento === "TD04" && <span className="text-ink-faint">NC </span>}
                        {numeroFattura(f)}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{nomeCliente.get(f.clienteId) ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{formattaData(f.dataEmissione)}</td>
                    <td
                      className={`px-4 py-3 text-right tabular-nums ${f.tipoDocumento === "TD04" ? "text-danger" : ""}`}
                    >
                      {f.tipoDocumento === "TD04" ? "−" : ""}
                      {formattaEuro(totaleDocumento(f))}
                    </td>
                    <td className="px-4 py-3">
                      <StatoBadge stato={f.stato} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {f.xmlProgressivo ? `generato (${f.xmlProgressivo})` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
