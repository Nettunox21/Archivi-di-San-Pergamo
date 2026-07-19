import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export type WikiDocument = {
    slug: string;
    title: string;
    /** Immagine di copertina mostrata nella card della griglia */
    image: string;
    /** Immagine di sfondo mostrata dietro il testo nella modale (può essere diversa da "image") */
    background: string;
    description: string;
    /** Testo diviso in pagine (una stringa HTML per pagina) */
    pages: string[];
};

const DOCS_DIR = path.join(process.cwd(), "content/documenti");

// Separatore di pagina da usare nel corpo del .md: una riga con scritto ":::pagina:::"
const PAGE_BREAK = /\r?\n\s*:::pagina:::\s*\r?\n/;

function splitIntoPages(content: string): string[] {
    return content
        .split(PAGE_BREAK)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length > 0)
        .map((chunk) => marked.parse(chunk) as string);
}

function readDocument(slug: string, raw: string): WikiDocument {
    const { data, content } = matter(raw);

    return {
        slug,
        title: data.title ?? slug,
        image: data.image ?? "",
        background: data.background ?? data.image ?? "",
        description: data.description ?? "",
        pages: splitIntoPages(content),
    };
}

export function getDocuments(): WikiDocument[] {
    if (!fs.existsSync(DOCS_DIR)) return [];

    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));

    return files.map((file) => {
        const slug = file.replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
        return readDocument(slug, raw);
    });
}

export function getDocument(slug: string): WikiDocument | null {
    const filePath = path.join(DOCS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    return readDocument(slug, raw);
}
