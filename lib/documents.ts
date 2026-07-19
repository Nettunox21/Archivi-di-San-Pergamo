import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

export type WikiDocument = {
    slug: string;
    title: string;
    image: string;
    description: string;
    contentHTML: string;
};

const DOCS_DIR = path.join(process.cwd(), "content/documenti");

export function getDocuments(): WikiDocument[] {
    if (!fs.existsSync(DOCS_DIR)) return [];

    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".md"));

    return files.map((file) => {
        const slug = file.replace(/\.md$/, "");
        const raw = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
        const { data, content } = matter(raw);

        return {
            slug,
            title: data.title ?? slug,
            image: data.image ?? "",
            description: data.description ?? "",
            contentHTML: marked.parse(content) as string,
        };
    });
}

export function getDocument(slug: string): WikiDocument | null {
    const filePath = path.join(DOCS_DIR, `${slug}.md`);
    if (!fs.existsSync(filePath)) return null;

    const raw = fs.readFileSync(filePath, "utf-8");
    const { data, content } = matter(raw);

    return {
        slug,
        title: data.title ?? slug,
        image: data.image ?? "",
        description: data.description ?? "",
        contentHTML: marked.parse(content) as string,
    };
}
