import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leggiClienti } from "@/lib/data/clienti";
import { leggiFatture } from "@/lib/data/fatture";
import { imponibileFiscale, numeroFattura } from "@/lib/domain/fattura";
import { nomeCliente } from "@/lib/domain/cliente";

function csvEscape(valore: string): string {
  if (valore.includes(";") || valore.includes('"') || valore.includes("\n")) {
    return `"${valore.replace(/"/g, '""')}"`;
  }
  return valore;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ errore: "Non autenticato." }, { status: 401 });
  }

  const annoParam = request.nextUrl.searchParams.get("anno");
  const anno = annoParam ? Number(annoParam) : new Date().getFullYear();

  const [fatture, clienti] = await Promise.all([leggiFatture(supabase, user.id), leggiClienti(supabase, user.id)]);
  const nomiClienti = new Map(clienti.map((c) => [c.id, nomeCliente(c)]));

  const dellAnno = fatture.filter((f) => f.stato !== "annullata" && f.anno === anno);

  const intestazione = [
    "Tipo",
    "Numero",
    "Cliente",
    "Data emissione",
    "Data incasso",
    "Stato",
    "Imponibile",
    "Bollo",
    "Bollo riaddebitato",
  ];
  // Importi come numero grezzo con virgola decimale: un CSV finisce in un
  // foglio di calcolo, dove "1.234,56 €" è testo e non si somma.
  const righe = dellAnno.map((f) =>
    [
      f.tipoDocumento === "TD04" ? "Nota di credito" : "Fattura",
      numeroFattura(f),
      nomiClienti.get(f.clienteId) ?? "",
      f.dataEmissione,
      f.dataIncasso ?? "",
      f.stato,
      (f.tipoDocumento === "TD04" ? -imponibileFiscale(f) : imponibileFiscale(f)).toFixed(2).replace(".", ","),
      f.bolloApplicato ? "sì" : "no",
      f.bolloApplicato ? (f.bolloRiaddebitato ? "al cliente" : "a mio carico") : "",
    ]
      .map((v) => csvEscape(String(v)))
      .join(";")
  );

  const csv = [intestazione.join(";"), ...righe].join("\n");
  const bom = "﻿"; // per aprire correttamente in Excel con caratteri accentati

  return new NextResponse(bom + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fatture-${anno}.csv"`,
      "Cache-Control": "no-store, private",
    },
  });
}
