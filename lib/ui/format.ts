export function formattaEuro(valore: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(valore);
}

export function formattaData(iso: string): string {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(iso)
  );
}

export function giorniMancanti(dataIso: string): number {
  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const scadenza = new Date(dataIso);
  scadenza.setHours(0, 0, 0, 0);
  return Math.round((scadenza.getTime() - oggi.getTime()) / (1000 * 60 * 60 * 24));
}
