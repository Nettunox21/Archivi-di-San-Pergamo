import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type Azienda = {
    slug: string;
    nome: string;
    titolare: string;
    nazione: string;
    descrizione: string;
    /** Pagina dell'azienda: "/qualcosa" = pagina interna, "https://..." = sito esterno */
    link: string;
    /** Logo opzionale: deve stare in /public (es. /images/logo-azienda.png) */
    logo: string;
    /** Se false l'azienda compare nel portale ma NON nei banner pubblicitari */
    pubblicita: boolean;
    ordine: number;
};

const DIR = path.join(process.cwd(), "content/talanton");

function toBool(v: unknown, predefinito: boolean): boolean {
    if (v === undefined || v === null || v === "") return predefinito;
    if (typeof v === "boolean") return v;
    const s = String(v).trim().toLowerCase();
    if (["no", "false", "off", "0"].includes(s)) return false;
    if (["si", "sì", "yes", "true", "on", "1"].includes(s)) return true;
    return predefinito;
}

function leggi(slug: string, raw: string): Azienda {
    const { data } = matter(raw);
    return {
        slug,
        nome: String(data.nome ?? slug),
        titolare: String(data.titolare ?? ""),
        nazione: String(data.nazione ?? ""),
        descrizione: String(data.descrizione ?? ""),
        link: String(data.link ?? ""),
        logo: String(data.logo ?? ""),
        pubblicita: toBool(data.pubblicita, true),
        ordine: Number(data.ordine ?? 0) || 0,
    };
}

export function getAziende(): Azienda[] {
    if (!fs.existsSync(DIR)) return [];
    return fs
        .readdirSync(DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => leggi(f.replace(/\.md$/, ""), fs.readFileSync(path.join(DIR, f), "utf-8")))
        .sort((a, b) => b.ordine - a.ordine || a.nome.localeCompare(b.nome, "it"));
}

/** Solo le aziende che hanno una pagina collegata e non hanno disattivato la pubblicità. */
export function getAziendePubblicita(): Azienda[] {
    return getAziende().filter((a) => a.pubblicita && a.link);
}
