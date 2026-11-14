import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { db, eq } from "@/lib/db";
import { daTesto } from "@/lib/numeri";
import { fazioneId } from "@/lib/fazioni";

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
    /** Risorsa dell'economia da mostrare nel contatore (nome come scritto nella pagina Economia) */
    risorsa: string;
    /** Fazione che possiede la risorsa */
    fazione: string;
    /** Carote in uno stack */
    stack: number;
    /** Numero massimo di quadrati del contatore (oltre = "57+") */
    quadrati: number;
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
        risorsa: data.risorsa ? String(data.risorsa) : "Carote d'Oro",
        fazione: data.fazione ? String(data.fazione) : "San Pergamo",
        stack: numero(data.stack, 64),
        quadrati: numero(data.quadrati, 57),
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

/* ---------- Disponibilità (collegata all'economia) ---------- */

export type Scorte = { stack: number; massimo: number; pieno: boolean };

const normalizza = (t: string) =>
    t
        .toLowerCase()
        .replace(/[\u2018\u2019\u02bc`´]/g, "'")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();

/** Stack di carote posseduti dalla fazione, letti dall'economia. null se la risorsa non si trova o il database non risponde. */
export async function getScorteCarote(cfg: ConfigCarote): Promise<Scorte | null> {
    try {
        const risorse = await db<{ id: number; nome: string }[]>("/risorse?select=id,nome");
        const cercata = normalizza(cfg.risorsa);
        const r = risorse.find((x) => normalizza(x.nome) === cercata);
        if (!r) return null;

        const righe = await db<{ quantita: string }[]>(
            `/possedimenti?fazione=${eq(fazioneId(cfg.fazione))}&risorsa_id=eq.${r.id}&select=quantita`
        );
        const quantita = righe[0] ? daTesto(righe[0].quantita) : 0n;
        const stack = quantita / BigInt(cfg.stack);
        const massimo = cfg.quadrati;
        const pieno = stack >= BigInt(massimo);
        return { stack: pieno ? massimo : Number(stack), massimo, pieno };
    } catch {
        return null;
    }
}
