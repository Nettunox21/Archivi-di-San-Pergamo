/** Colore del bollino di stato in base al testo scritto nel file (es. "Approvato", "In revisione"). */
export function classeStato(stato: string): string {
    const t = stato.toLowerCase();
    if (/(approvat|concess|attiv|valid|registrat)/.test(t)) return "sci-stato sci-stato--ok";
    if (/(revision|attesa|pendent|esame|istrutt|sospes)/.test(t)) return "sci-stato sci-stato--attesa";
    if (/(respint|scadut|revocat|rifiutat|decadut)/.test(t)) return "sci-stato sci-stato--no";
    return "sci-stato";
}
