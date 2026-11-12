import fs from "fs";
import path from "path";

/* =========================================================
 *  TRAUMA TEAM
 *  Dati letti da:
 *    content/aziende/trauma-team.md              -> piani e programma
 *    content/aziende/trauma-team-regolamento.md  -> regolamento (pop-up)
 *    content/talanton/trauma-team.md             -> scheda azienda (titolare = chi riceve le notifiche)
 * ========================================================= */

const DIR = path.join(process.cwd(), "content/aziende");

export type PianoTT = {
    nome: string;
    prezzo: string;
    durata: string;
    descrizione: string; // testo libero
    caratteristiche: string[]; // elenco puntato
    programma: boolean; // true = non selezionabile (es. Secure your Soul)
};

/** Legge piani e programmi. Righe "// ..." ignorate, "# Nome" apre un piano. */
export function getPianiTT(): PianoTT[] {
    const file = path.join(DIR, "trauma-team.md");
    if (!fs.existsSync(file)) return [];
    const righe = fs.readFileSync(file, "utf-8").split(/\r?\n/);

    const piani: PianoTT[] = [];
    let corrente: PianoTT | null = null;
    const testi: string[] = [];

    const chiudi = () => {
        if (corrente) corrente.descrizione = testi.join(" ").trim();
        testi.length = 0;
    };

    for (const grezza of righe) {
        const r = grezza.trim();
        if (!r || r.startsWith("//")) continue;

        if (/^#\s+\S/.test(r)) {
            chiudi();
            corrente = { nome: r.replace(/^#\s+/, "").trim(), prezzo: "", durata: "", descrizione: "", caratteristiche: [], programma: false };
            piani.push(corrente);
            continue;
        }
        if (!corrente) continue;

        const chiave = r.match(/^(prezzo|durata|tipo)\s*:\s*(.*)$/i);
        if (chiave) {
            const k = chiave[1].toLowerCase();
            const v = chiave[2].trim();
            if (k === "prezzo") corrente.prezzo = v;
            else if (k === "durata") corrente.durata = v;
            else corrente.programma = /^programma$/i.test(v);
            continue;
        }
        if (/^[-*]\s+/.test(r)) corrente.caratteristiche.push(r.replace(/^[-*]\s+/, "").trim());
        else testi.push(r);
    }
    chiudi();
    return piani;
}

/** Solo i piani che il cliente può selezionare. */
export const getPianiSelezionabili = () => getPianiTT().filter((p) => !p.programma);

/** Testo markdown del regolamento (vuoto se il file non esiste). */
export function getRegolamentoTT(): string {
    const file = path.join(DIR, "trauma-team-regolamento.md");
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}
