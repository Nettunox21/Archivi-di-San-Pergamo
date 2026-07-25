import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { parseWiki } from "@/lib/markdown";

export default function DocumentiHelpPage() {
    const filePath = path.join(process.cwd(), "content/documenti-help.md");

    let markdown: string;
    try {
        markdown = fs.readFileSync(filePath, "utf-8");
    } catch {
        notFound();
    }

    const html = parseWiki(markdown);

    // parseWiki() restituisce già l'intero markup (wiki-layout/article incluso),
    // niente wrapper qui.
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
