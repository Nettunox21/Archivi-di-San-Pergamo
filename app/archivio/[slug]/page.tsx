import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { parseWiki } from "@/lib/markdown";

marked.setOptions({
    gfm: true,
    breaks: true,
});

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const dir = path.join(process.cwd(), "content/archivio");

    let files: string[];
    try {
        files = fs.readdirSync(dir);
    } catch {
        notFound();
    }

    const match = files.find(file => {
        const normalized = file
            .replace(/\.[^/.]+$/, "")
            .toLowerCase()
            .trim()
            .replace(/\s+/g, "-");

        return normalized === slug;
    });

    if (!match) {
        notFound();
    }

    const filePath = path.join(dir, match);

    let markdown: string;
    try {
        markdown = fs.readFileSync(filePath, "utf-8");
    } catch {
        notFound();
    }

    const html = parseWiki(markdown);

    // parseWiki() restituisce già l'intero markup, incluso
    // <div class="wiki-layout"><article class="markdown-content">...</article></div>.
    // Niente wrapper qui, altrimenti si annida due volte (bug del doppio wiki-layout).
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
