import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content/aziende");

/* =========================
 *  TERRENI  (content/aziende/terreni.md)
 *
 *  # Nazione
 *  ## Zona | coordinate (opzionali)
 *  - Nome terreno | prezzo | nota (opzionale)
 * ========================= */

export type Terreno = { nome: string; prezzo: string; nota: string };
export type Zona = { nome: string; coordinate: string; terreni: Terreno[] };
export type NazioneTerreni = { nome: string; zone: Zona[] };

export function getTerreni(): NazioneTerreni[] {
    const file = path.join(DIR, "terreni.md");
    if (!fs.existsSync(file)) return [];
    const righe = fs.readFileSync(file, "utf-8").split(/\r?\n/);

    const nazioni: NazioneTerreni[] = [];
    let nazione: NazioneTerreni | null = null;
    let zona: Zona | null = null;

    for (const grezza of righe) {
        const r = grezza.trim();
        if (r.startsWith("## ")) {
            if (!nazione) continue;
            const [nome, ...resto] = r.slice(3).split("|");
            zona = { nome: nome.trim(), coordinate: resto.join("|").trim(), terreni: [] };
            nazione.zone.push(zona);
        } else if (r.startsWith("# ")) {
            nazione = { nome: r.slice(2).trim(), zone: [] };
            nazioni.push(nazione);
            zona = null;
        } else if (r.startsWith("- ") || r.startsWith("* ")) {
            if (!zona) continue;
            const [nome, prezzo, ...nota] = r.slice(2).split("|").map((p) => p.trim());
            if (!nome) continue;
            zona.terreni.push({ nome, prezzo: prezzo ?? "", nota: nota.join(" | ") });
        }
    }
    return nazioni;
}

/* =========================
 *  BREVETTI  (content/aziende/brevetti/*.md)
 * ========================= */

export type Brevetto = {
    slug: string;
    codice: string;
    titolo: string;
    inventore: string;
    fazione: string;
    data: string; // già formattata GG/MM/AAAA se in formato AAAA-MM-GG
    dataOrd: string; // per ordinamento
    categoria: string;
    stato: string;
    immagine: string;
    estratto: string; // primo pezzo di testo semplice, per anteprima e ricerca
    corpo: string; // markdown completo
};

function s(v: unknown): string {
    return v === undefined || v === null ? "" : String(v).trim();
}

function formattaData(v: unknown): { testo: string; ord: string } {
    // gray-matter trasforma 2026-03-12 in un oggetto Date
    let iso = "";
    if (v instanceof Date && !isNaN(v.getTime())) iso = v.toISOString().slice(0, 10);
    else iso = s(v);
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? { testo: `${m[3]}/${m[2]}/${m[1]}`, ord: iso } : { testo: iso, ord: iso };
}

function aTestoSemplice(md: string): string {
    return md
        .replace(/^\s*[-*]\s+/gm, " ")
        .replace(/[#>*_`\[\]\(\)!]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function leggiBrevetto(slug: string, raw: string): Brevetto {
    const { data, content } = matter(raw);
    const d = formattaData(data.data);
    const piano = aTestoSemplice(content);
    return {
        slug,
        codice: s(data.codice) || slug,
        titolo: s(data.titolo) || slug,
        inventore: s(data.inventore),
        fazione: s(data.fazione),
        data: d.testo,
        dataOrd: d.ord,
        categoria: s(data.categoria),
        stato: s(data.stato),
        immagine: s(data.immagine),
        estratto: piano.length > 220 ? piano.slice(0, 220).trimEnd() + "…" : piano,
        corpo: content,
    };
}

export function getBrevetti(): Brevetto[] {
    const dir = path.join(DIR, "brevetti");
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md"))
        .map((f) => leggiBrevetto(f.replace(/\.md$/, ""), fs.readFileSync(path.join(dir, f), "utf-8")))
        .sort((a, b) => b.dataOrd.localeCompare(a.dataOrd) || a.codice.localeCompare(b.codice));
}

export function getBrevetto(slug: string): Brevetto | undefined {
    let decoded = slug;
    try {
        decoded = decodeURIComponent(slug);
    } catch {
        // slug malformato: lo usiamo così com'è
    }
    return getBrevetti().find((b) => b.slug === decoded);
}
