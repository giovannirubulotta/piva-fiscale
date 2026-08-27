import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { leggiIncassi } from "@/lib/data/incassi";
import { formattaEuro } from "@/lib/ui/format";

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

  const incassi = await leggiIncassi(supabase, user.id);
  const dellAnno = incassi.filter(
    (i) => i.stato !== "annullata" && new Date(i.dataEmissione).getFullYear() === anno
  );

  const intestazione = ["Cliente", "Numero fattura", "Data emissione", "Data incasso", "Stato", "Importo netto", "Bollo"];
  const righe = dellAnno.map((i) =>
    [
      i.cliente,
      i.numeroFattura ?? "",
      i.dataEmissione,
      i.dataIncasso ?? "",
      i.stato,
      formattaEuro(i.importoNetto),
      i.bolloApplicato ? "sì" : "no",
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
      "Content-Disposition": `attachment; filename="incassi-${anno}.csv"`,
    },
  });
}
