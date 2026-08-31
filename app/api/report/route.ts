import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { leggiSpese } from "@/lib/data/spese";
import { leggiFornitori } from "@/lib/data/fornitori";
import { imponibileFiscale, numeroFattura } from "@/lib/domain/fattura";
import { nomeCliente } from "@/lib/domain/cliente";
import { componiCsv } from "@/lib/domain/report";

/**
 * L'esportazione del report in CSV.
 *
 * La composizione del CSV — separatore, virgolette, decimali, BOM — sta nel
 * dominio ed è coperta da test: era scritta qui a mano, e una funzione di
 * escape che vive dentro una route HTTP è una funzione che nessuno prova mai.
 *
 * Il periodo arriva come `da`/`a`. `anno` resta accettato perché è il
 * parametro che usa il collegamento all'archivio annuale, che continua a
 * funzionare.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  const parametri = request.nextUrl.searchParams;
  const cosa = parametri.get("cosa") === "spese" ? "spese" : "fatture";

  const anno = Number(parametri.get("anno")) || new Date().getFullYear();
  const da = parametri.get("da") ?? `${anno}-01-01`;
  const a = parametri.get("a") ?? `${anno}-12-31`;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(da) || !/^\d{4}-\d{2}-\d{2}$/.test(a) || a < da) {
    return NextResponse.json({ errore: "Periodo non valido." }, { status: 400 });
  }

  const csv = cosa === "spese" ? await csvSpese(supabase, user.id, da, a) : await csvFatture(supabase, user.id, da, a);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${cosa}-${da}_${a}.csv"`,
      // Sono dati contabili personali: non devono restare in nessuna cache
      // condivisa lungo il percorso.
      "Cache-Control": "no-store, private",
    },
  });
}

type Client = Awaited<ReturnType<typeof createClient>>;

async function csvFatture(supabase: Client, userId: string, da: string, a: string): Promise<string> {
  const [fatture, clienti] = await Promise.all([leggiFatture(supabase, userId), leggiClienti(supabase, userId)]);
  const nomi = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));

  const righe = fatture
    .filter((f) => f.stato !== "annullata")
    .filter((f) => f.dataEmissione >= da && f.dataEmissione <= a)
    .sort((x, y) => x.dataEmissione.localeCompare(y.dataEmissione))
    .map((f) => [
      f.tipoDocumento === "TD04" ? "Nota di credito" : "Fattura",
      numeroFattura(f),
      nomi.get(f.clienteId) ?? "",
      f.dataEmissione,
      f.dataIncasso ?? "",
      f.stato,
      // Il segno negativo delle note di credito va nel CSV: chi somma la
      // colonna in un foglio di calcolo deve ottenere il fatturato vero.
      f.tipoDocumento === "TD04" ? -imponibileFiscale(f) : imponibileFiscale(f),
      f.bolloApplicato ? "sì" : "no",
      f.bolloApplicato ? (f.bolloRiaddebitato ? "al cliente" : "a mio carico") : "",
    ]);

  return componiCsv(
    [
      "Tipo",
      "Numero",
      "Cliente",
      "Data emissione",
      "Data incasso",
      "Stato",
      "Imponibile",
      "Bollo",
      "Bollo riaddebitato",
    ],
    righe
  );
}

async function csvSpese(supabase: Client, userId: string, da: string, a: string): Promise<string> {
  const [spese, fornitori] = await Promise.all([leggiSpese(supabase, userId), leggiFornitori(supabase, userId)]);
  const nomi = new Map(fornitori.map((f) => [f.id, f.denominazione]));

  const righe = spese
    .filter((s) => s.data >= da && s.data <= a)
    .sort((x, y) => x.data.localeCompare(y.data))
    .map((s) => [s.data, s.descrizione, s.categoria ?? "", s.fornitoreId ? (nomi.get(s.fornitoreId) ?? "") : "", s.importo]);

  return componiCsv(["Data", "Descrizione", "Categoria", "Fornitore", "Importo"], righe);
}
