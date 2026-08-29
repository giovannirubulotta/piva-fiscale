"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { rimuoviCliente } from "./actions";

export interface VoceCliente {
  id: string;
  nome: string;
  tipologia: string;
  identificativo: string | null;
  email: string | null;
  telefono: string | null;
  citta: string | null;
  ultimaFattura: string | null;
  /** false se mancano dati obbligatori per generare l'XML: si segnala prima, non al momento dell'invio. */
  completo: boolean;
  /** Quali dati mancano: dirlo è più utile che limitarsi a marcare la riga. */
  mancanti: string[];
}

/**
 * Ricerca e filtro lato client: l'anagrafica di un singolo professionista sta
 * in poche decine di righe, filtrarle in memoria evita un round-trip per ogni
 * tasto premuto senza alcun costo percepibile.
 */
export function RicercaClienti({ clienti }: { clienti: VoceCliente[] }) {
  const [query, setQuery] = useState("");
  const [tipologia, setTipologia] = useState("");

  const tipologie = useMemo(
    () => [...new Set(clienti.map((c) => c.tipologia))].sort((a, b) => a.localeCompare(b)),
    [clienti]
  );

  const risultati = useMemo(() => {
    const termine = query.trim().toLowerCase();
    return clienti.filter((c) => {
      if (tipologia && c.tipologia !== tipologia) return false;
      if (!termine) return true;
      return [c.nome, c.identificativo, c.email, c.citta].some((campo) =>
        campo?.toLowerCase().includes(termine)
      );
    });
  }, [clienti, query, tipologia]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca per nome, partita IVA, email o città"
          className="campo-input flex-1"
          aria-label="Cerca clienti"
        />
        <select
          value={tipologia}
          onChange={(e) => setTipologia(e.target.value)}
          className="campo-input sm:w-64"
          aria-label="Filtra per tipologia"
        >
          <option value="">Tutte le tipologie</option>
          {tipologie.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-ink-faint">
        {risultati.length === clienti.length
          ? `${clienti.length} ${clienti.length === 1 ? "cliente" : "clienti"}`
          : `${risultati.length} su ${clienti.length}`}
      </p>

      {risultati.length === 0 ? (
        <p className="text-sm text-ink-muted py-8 text-center">Nessun cliente corrisponde alla ricerca.</p>
      ) : (
        <>
          {/* Mobile: schede. Una tabella a sei colonne su 375px è illeggibile. */}
          <div className="flex flex-col gap-3 md:hidden">
            {risultati.map((c) => (
              <div key={c.id} className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{c.nome}</div>
                    <div className="text-xs text-ink-muted">{c.tipologia}</div>
                  </div>
                  {!c.completo && <BadgeIncompleto mancanti={c.mancanti} />}
                </div>
                <dl className="text-xs text-ink-muted flex flex-col gap-0.5">
                  {c.identificativo && (
                    <div className="flex gap-2">
                      <dt className="text-ink-faint">ID fiscale</dt>
                      <dd className="font-mono">{c.identificativo}</dd>
                    </div>
                  )}
                  {c.email && (
                    <div className="flex gap-2 min-w-0">
                      <dt className="text-ink-faint shrink-0">Email</dt>
                      <dd className="truncate">{c.email}</dd>
                    </div>
                  )}
                  {c.ultimaFattura && (
                    <div className="flex gap-2">
                      <dt className="text-ink-faint">Ultima fattura</dt>
                      <dd>{c.ultimaFattura}</dd>
                    </div>
                  )}
                </dl>
                <Azioni id={c.id} />
              </div>
            ))}
          </div>

          {/* Desktop: tabella */}
          <div className="hidden md:block rounded-xl border border-line bg-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase tracking-wide border-b border-line">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Tipologia</th>
                  <th className="px-4 py-3 font-medium">ID fiscale</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Ultima fattura</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {risultati.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <span className="font-medium">{c.nome}</span>
                      {!c.completo && (
                        <span className="ml-2 align-middle">
                          <BadgeIncompleto mancanti={c.mancanti} />
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{c.tipologia}</td>
                    <td className="px-4 py-3 text-ink-muted font-mono text-xs">{c.identificativo ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.email ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{c.ultimaFattura ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Azioni id={c.id} />
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

function BadgeIncompleto({ mancanti }: { mancanti: string[] }) {
  return (
    <span
      className="text-[10px] uppercase tracking-wide text-warn border border-warn/40 bg-warn/10 rounded-full px-2 py-0.5 whitespace-nowrap"
      title={`Per la fattura elettronica manca: ${mancanti.join(", ")}.`}
    >
      Dati incompleti
    </span>
  );
}

function Azioni({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-3 justify-end">
      <Link href={`/clienti/${id}`} className="text-xs text-accent hover:underline">
        modifica
      </Link>
      <form action={rimuoviCliente}>
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="text-xs text-danger hover:underline">
          elimina
        </button>
      </form>
    </div>
  );
}
