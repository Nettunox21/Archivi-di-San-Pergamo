import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { parseWiki } from "@/lib/markdown"; // ✅ MOVE HERE

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

    const html = parseWiki(markdown); // ✅ works now

    return (
        <div className="wiki-layout">
            <article
                className="markdown-content"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    );
}