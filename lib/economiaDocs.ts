import fs from "fs";
import path from "path";
import matter from "gray-matter";

const DIR = path.join(process.cwd(), "content/documenti");

/** Elenco leggero dei documenti (slug + titolo) per collegarli agli scambi. */
export function elencoDocumenti(): { slug: string; title: string }[] {
    if (!fs.existsSync(DIR)) return [];
    return fs
        .readdirSync(DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => {
            const slug = f.replace(/\.md$/, "");
            const { data } = matter(fs.readFileSync(path.join(DIR, f), "utf-8"));
            return { slug, title: (data.title as string) || slug };
        })
        .sort((a, b) => a.title.localeCompare(b.title, "it"));
}
