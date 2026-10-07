// Salva questo file come: lib/notizie.ts

import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface NewsArticle {
    slug: string;
    title: string;
    images: string[];
    date: string;
    location: string;
    reporter: string;
    text: string;
    order: number;
    stile: string;
    // true = l'articolo va nella sezione segreta (teorie del complotto)
    secret: boolean;
}

const NEWS_DIR = path.join(process.cwd(), "content/notizie");

// Legge il tag "secret" dal frontmatter.
// "secret: yes" viene letto da YAML come booleano true (yes/no sono booleani
// in YAML 1.1), quindi accettiamo sia true sia le stringhe yes/si/sì/true.
// Qualsiasi altra cosa (no, vuoto, campo assente) = articolo normale.
function parseSecret(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === "string") {
        return ["yes", "si", "sì", "true", "1"].includes(
            value.trim().toLowerCase()
        );
    }
    return false;
}

export function getNewsArticles(): NewsArticle[] {
    if (!fs.existsSync(NEWS_DIR)) return [];

    const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".md"));

    const articles = files.map((file) => {
        const filePath = path.join(NEWS_DIR, file);
        let raw = fs.readFileSync(filePath, "utf-8");

        // Tolleranza: "secret:yes" scritto senza spazio dopo i due punti
        // NON è YAML valido e farebbe crashare la build. Lo correggiamo
        // al volo in "secret: yes" prima di leggere il frontmatter.
        raw = raw.replace(/^secret:(?=\S)/im, "secret: ");

        const { data, content } = matter(raw);

        return {
            slug: file.replace(".md", ""),
            title: data.title || file.replace(".md", ""),
            images:
                Array.isArray(data.images) && data.images.length > 0
                    ? data.images
                    : data.image
                    ? [data.image]
                    : ["/images/placeholder-news.jpg"],
            date: data.date || "",
            location: data.location || "",
            reporter: data.reporter || "",
            text: content.trim(),
            order: Number(data.order) || 0,
            // Stile grafico speciale per l'articolo (es. "cyberpunk").
            // Vuoto = stile classico pergamena/oro.
            stile: typeof data.stile === "string" ? data.stile.trim() : "",
            secret: parseSecret(data.secret),
        };
    });

    // Ordine crescente nel campo "order": il valore più alto va in cima (più recente)
    return articles.sort((a, b) => b.order - a.order);
}
