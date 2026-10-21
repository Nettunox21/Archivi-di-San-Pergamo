import fs from "fs";
import path from "path";
import matter from "gray-matter";

/* ---------- Formati pubblicitari ---------- */

export type Formato =
    | { tipo: "banner" }
    | { tipo: "immagine"; file: string; testo: string; cta: string; alt: string }
    | { tipo: "video"; file: string; poster: string; testo: string; cta: string };

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
    /** Formati pubblicitari attivi (vuoto = nessuna pubblicità) */
    formati: Formato[];
    ordine: number;
};

/** Versione leggera passata al banner (componente client) */
export type AziendaPubblicita = {
    slug: string;
    nome: string;
    descrizione: string;
    link: string;
    logo: string;
    formati: Formato[];
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

function s(v: unknown): string {
    return v === undefined || v === null ? "" : String(v);
}

function leggiFormati(v: unknown, nome: string): Formato[] {
    // Campo assente: solo banner (come prima)
    if (v === undefined || v === null || v === "") return [{ tipo: "banner" }];
    // Vecchio stile: pubblicita: si / no
    if (typeof v === "boolean" || typeof v === "string") {
        return toBool(v, true) ? [{ tipo: "banner" }] : [];
    }
    if (!Array.isArray(v)) return [{ tipo: "banner" }];

    const out: Formato[] = [];
    for (const item of v) {
        const obj: Record<string, unknown> =
            typeof item === "string" ? { tipo: item } : (item as Record<string, unknown>) ?? {};
        const tipo = s(obj.tipo).trim().toLowerCase();
        if (tipo === "banner") {
            out.push({ tipo: "banner" });
        } else if (tipo === "immagine" && s(obj.file)) {
            out.push({
                tipo: "immagine",
                file: s(obj.file),
                testo: s(obj.testo),
                cta: s(obj.cta),
                alt: s(obj.alt) || nome,
            });
        } else if (tipo === "video" && s(obj.file)) {
            out.push({
                tipo: "video",
                file: s(obj.file),
                poster: s(obj.poster),
                testo: s(obj.testo),
                cta: s(obj.cta),
            });
        }
    }
    return out;
}

function leggi(slug: string, raw: string): Azienda {
    const { data } = matter(raw);
    const nome = s(data.nome) || slug;
    return {
        slug,
        nome,
        titolare: s(data.titolare),
        nazione: s(data.nazione),
        descrizione: s(data.descrizione),
        link: s(data.link),
        logo: s(data.logo),
        formati: leggiFormati(data.pubblicita, nome),
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

export function getAzienda(slug: string): Azienda | undefined {
    return getAziende().find((a) => a.slug === slug);
}

/** Solo le aziende con una pagina collegata e almeno un formato pubblicitario attivo. */
export function getAziendePubblicita(): AziendaPubblicita[] {
    return getAziende()
        .filter((a) => a.link && a.formati.length > 0)
        .map((a) => ({
            slug: a.slug,
            nome: a.nome,
            descrizione: a.descrizione,
            link: a.link,
            logo: a.logo,
            formati: a.formati,
        }));
}
