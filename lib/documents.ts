import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export type WikiDocument = {
    slug: string;
    title: string;
    /** Titolo della raccolta a cui appartiene (campo "raccolta" nel frontmatter) */
    raccolta: string;
    /** Immagine della raccolta: è l'unica immagine della card (il campo "image" nei documenti non esiste più) */
    image: string;
    /** Immagine di sfondo mostrata dietro il testo nella modale */
    background: string;
    description: string;
    /** Testo diviso in pagine (una stringa HTML per pagina) */
    pages: string[];
};

const DOCS_DIR = path.join(process.cwd(), "content/documenti");
const RACCOLTE_FILE = path.join(process.cwd(), "content/documenti-help.md");

// Separatore di pagina da usare nel corpo del .md: una riga con scritto ":::pagina:::"
const PAGE_BREAK = /\r?\n\s*:::pagina:::\s*\r?\n/;

function splitIntoPages(content: string): string[] {
    return content
        .split(PAGE_BREAK)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => marked.parse(chunk) as string);
}

/** Normalizza un titolo per confrontarlo (minuscole, niente accenti/apostrofi/parentesi) */
function norm(s: string): string {
    return s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\(.*?\)/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

type RaccoltaInfo = { titolo: string; immagine: string };

/** Legge titolo + immagine di ogni raccolta dal blocco :::raccolte di documenti-help.md */
function loadRaccolte(): RaccoltaInfo[] {
    if (!fs.existsSync(RACCOLTE_FILE)) return [];

    const raw = fs.readFileSync(RACCOLTE_FILE, "utf-8").replace(/\r\n/g, "\n");
    const block = raw.match(/:::raccolte([\s\S]*?):::/);
    if (!block) return [];

    const result: RaccoltaInfo[] = [];
    let current: Partial<RaccoltaInfo> | null = null;

    for (const line of block[1].split("\n")) {
        const img = line.match(/^\s*-\s*immagine:\s*(.+?)\s*$/);
        if (img) {
            if (current?.titolo && current.immagine) result.push(current as RaccoltaInfo);
            current = { immagine: img[1] };
            continue;
        }
        const tit = line.match(/^\s*titolo:\s*(.+?)\s*$/);
        if (tit && current) current.titolo = tit[1];
    }
    if (current?.titolo && current.immagine) result.push(current as RaccoltaInfo);

    return result;
}

function findRaccolta(nome: string, raccolte: RaccoltaInfo[]): RaccoltaInfo | null {
    if (!nome) return null;
    const n = norm(nome);
    return (
        raccolte.find((r) => norm(r.titolo) === n) ??
        // tollera "Il Papa" al posto di "Il Papa (capovolto)"
        raccolte.find((r) => norm(r.titolo).startsWith(n) || n.startsWith(norm(r.titolo))) ??
        null
    );
}

function readDocument(slug: string, raw: string, raccolte: RaccoltaInfo[]): WikiDocument {
    const { data, content } = matter(raw);
    const nomeRaccolta = typeof data.raccolta === "string" ? data.raccolta : "";
    const raccolta = findRaccolta(nomeRaccolta, raccolte);

    return {
        slug,
        title: data.title ?? slug,
        raccolta: raccolta?.titolo ?? nomeRaccolta,
        image: raccolta?.immagine ?? "",
        background: data.background ?? "",
        description: data.description ?? "",
        pages: splitIntoPages(content),
    };
}

export function getDocuments(): WikiDocument[] {
    if (!fs.existsSync(DOCS_DIR)) return [];

    const raccolte = loadRaccolte();
    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));

    return files.map((file) => {
        const slug = file.replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
        return readDocument(slug, raw, raccolte);
    });
}

export function getDocument(slug: string): WikiDocument | null {
    const filePath = path.join(DOCS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    return readDocument(slug, raw, loadRaccolte());
}
