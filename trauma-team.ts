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
    nota: string; // riga piccola sotto il prezzo
    rischio: number; // massimo grado di rischio coperto (0 = non indicato)
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
            corrente = { nome: r.replace(/^#\s+/, "").trim(), prezzo: "", durata: "", nota: "", rischio: 0, descrizione: "", caratteristiche: [], programma: false };
            piani.push(corrente);
            continue;
        }
        if (!corrente) continue;

        const chiave = r.match(/^(prezzo|durata|tipo|nota|rischio)\s*:\s*(.*)$/i);
        if (chiave) {
            const k = chiave[1].toLowerCase();
            const v = chiave[2].trim();
            if (k === "prezzo") corrente.prezzo = v;
            else if (k === "durata") corrente.durata = v;
            else if (k === "nota") corrente.nota = v;
            else if (k === "rischio") corrente.rischio = /^\d+$/.test(v) ? Number(v) : 0;
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

/* ---------- Gradi di rischio ---------- */

export type RischioTT = { livello: number; titolo: string; descrizione: string };

/** Legge content/aziende/trauma-team-rischi.md ("# 1", "titolo: ...", testo). */
export function getRischiTT(): RischioTT[] {
    const file = path.join(DIR, "trauma-team-rischi.md");
    if (!fs.existsSync(file)) return [];
    const rischi: RischioTT[] = [];
    let corrente: RischioTT | null = null;
    const testi: string[] = [];

    const chiudi = () => {
        if (corrente) corrente.descrizione = testi.join(" ").trim();
        testi.length = 0;
    };

    for (const grezza of fs.readFileSync(file, "utf-8").split(/\r?\n/)) {
        const r = grezza.trim();
        if (!r || r.startsWith("//")) continue;

        const intestazione = r.match(/^#\s+(\d+)\s*$/);
        if (intestazione) {
            chiudi();
            corrente = { livello: Number(intestazione[1]), titolo: "", descrizione: "" };
            rischi.push(corrente);
            continue;
        }
        if (!corrente) continue;

        const titolo = r.match(/^titolo\s*:\s*(.*)$/i);
        if (titolo) corrente.titolo = titolo[1].trim();
        else testi.push(r);
    }
    chiudi();
    return rischi.sort((a, b) => a.livello - b.livello);
}
