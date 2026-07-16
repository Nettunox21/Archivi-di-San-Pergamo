// Salva questo file come: lib/notizie.ts

import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface NewsArticle {
    slug: string;
    title: string;
    image: string;
    date: string;
    location: string;
    reporter: string;
    text: string;
    created: number;
}

const NEWS_DIR = path.join(process.cwd(), "content/notizie");

export function getNewsArticles(): NewsArticle[] {
    if (!fs.existsSync(NEWS_DIR)) return [];

    const files = fs.readdirSync(NEWS_DIR).filter((f) => f.endsWith(".md"));

    const articles = files.map((file) => {
        const filePath = path.join(NEWS_DIR, file);
        const raw = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(raw);
        const stats = fs.statSync(filePath);

        return {
            slug: file.replace(".md", ""),
            title: data.title || file.replace(".md", ""),
            image: data.image || "/images/placeholder-news.jpg",
            date: data.date || "",
            location: data.location || "",
            reporter: data.reporter || "",
            text: content.trim(),
            created: stats.birthtimeMs,
        };
    });

    // Ordine di aggiunta: dalla più recente alla più vecchia (in cima le ultime notizie)
    return articles.sort((a, b) => b.created - a.created);
}
