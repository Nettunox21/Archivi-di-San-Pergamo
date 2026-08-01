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
}

const NEWS_DIR = path.join(process.cwd(), "content/notizie");

export function getNewsArticles(): NewsArticle[] {
    if (!fs.existsSync(NEWS_DIR)) return [];

    const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".md"));

    const articles = files.map((file) => {
        const filePath = path.join(NEWS_DIR, file);
        const raw = fs.readFileSync(filePath, "utf-8");
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
        };
    });

    // Ordine crescente nel campo "order": il valore più alto va in cima (più recente)
    return articles.sort((a, b) => b.order - a.order);
}
