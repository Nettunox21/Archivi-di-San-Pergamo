// Enti (istituti e aziende) collegati alle nazioni. Dati statici da content/fazioni/enti.md:
// nessuna scrittura sul database, si modifica solo da GitHub.
import fs from "fs";
import path from "path";
import { fazioneId } from "@/lib/fazioni";

const FILE = path.join(process.cwd(), "content/fazioni/enti.md");

export type TipoEnte = "istituto" | "azienda";
export type Condivisione =
    | { modo: "tutto" }
    | { modo: "niente" }
    | { modo: "elenco"; risorse: string[] };

export type Ente = {
    nome: string;
    tipo: TipoEnte;
    /** ID delle nazioni collegate (stesso ID dell'economia) */
    nazioni: string[];
    condivide: Condivisione;
    descrizione: string;
    link: string;
};

/** Per confrontare i nomi delle risorse senza badare a maiuscole e accenti. */
export const normalizzaNome = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();

const lista = (v: string) => v.split(",").map((x) => x.trim()).filter(Boolean);

function leggiCondivisione(v: string): Condivisione {
    const n = normalizzaNome(v);
    if (n === "" || n === "niente" || n === "nessuna") return { modo: "niente" };
    if (n === "tutto" || n === "tutte" || n === "magazzino") return { modo: "tutto" };
    return { modo: "elenco", risorse: lista(v) };
}

export function getEnti(): Ente[] {
    if (!fs.existsSync(FILE)) return [];
    const righe = fs.readFileSync(FILE, "utf-8").split(/\r?\n/);

    const enti: Ente[] = [];
    let corrente: Ente | null = null;

    for (const grezza of righe) {
        const r = grezza.trim();
        if (!r || r.startsWith("//")) continue;

        if (r.startsWith("## ")) {
            corrente = { nome: r.slice(3).trim(), tipo: "istituto", nazioni: [], condivide: { modo: "niente" }, descrizione: "", link: "" };
            enti.push(corrente);
            continue;
        }
        if (!corrente) continue;

        const i = r.indexOf(":");
        if (i < 0) continue;
        const chiave = normalizzaNome(r.slice(0, i));
        const valore = r.slice(i + 1).trim();

        if (chiave === "tipo") corrente.tipo = normalizzaNome(valore) === "azienda" ? "azienda" : "istituto";
        else if (chiave === "nazioni") corrente.nazioni = lista(valore).map(fazioneId);
        else if (chiave === "condivide") corrente.condivide = leggiCondivisione(valore);
        else if (chiave === "descrizione") corrente.descrizione = valore;
        else if (chiave === "link") corrente.link = valore;
    }
    return enti;
}

/** Enti collegati a una nazione (un ente con due nazioni compare in entrambe). */
export const entiDellaFazione = (idFazione: string) => getEnti().filter((e) => e.nazioni.includes(idFazione));
