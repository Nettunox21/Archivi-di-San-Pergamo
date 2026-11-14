import fs from "fs";
import path from "path";
import matter from "gray-matter";

/* =========================================================
 *  CAROTE D'ORO
 *    content/aziende/carote-doro.md              -> nome, slogan, prezzo + testo "La nostra storia"
 *    content/aziende/carote-doro-dove.md         -> sezione "Dove trovarci"
 *    content/aziende/carote-doro-regolamento.md  -> regolamento (pop-up)
 *    content/talanton/carote-doro.md             -> scheda nel Portale (titolare = chi riceve le notifiche)
 * ========================================================= */

const DIR = path.join(process.cwd(), "content/aziende");

export type ConfigCarote = {
    nome: string;
    slogan: string;
    /** Prezzo: `smeraldi` smeraldi ogni `carote` carote */
    smeraldi: number;
    carote: number;
    storia: string; // markdown
};

function numero(v: unknown, predefinito: number): number {
    const n = typeof v === "string" ? Number(v.trim()) : v;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : predefinito;
}

function leggi(nomeFile: string): string {
    const file = path.join(DIR, nomeFile);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
}

export function getConfigCarote(): ConfigCarote {
    const { data, content } = matter(leggi("carote-doro.md"));
    return {
        nome: data.nome ? String(data.nome) : "Carote d'Oro",
        slogan: data.slogan ? String(data.slogan) : "",
        smeraldi: numero(data.smeraldi, 1),
        carote: numero(data.carote, 32),
        // toglie gli eventuali commenti <!-- ... --> usati come istruzioni
        storia: content.replace(/<!--[\s\S]*?-->/g, "").trim(),
    };
}

export const getDoveCarote = () => leggi("carote-doro-dove.md");
export const getRegolamentoCarote = () => leggi("carote-doro-regolamento.md");

/** Smeraldi da pagare per `n` carote (arrotondato per eccesso al lotto intero). */
export function prezzoSmeraldi(n: number, c: { smeraldi: number; carote: number }): number {
    return Math.ceil((n * c.smeraldi) / c.carote);
}
