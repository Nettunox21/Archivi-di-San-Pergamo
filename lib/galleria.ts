import fs from "fs";
import path from "path";
import matter from "gray-matter";

export type Opera = {
    slug: string;
    title: string;
    image: string;
    description: string;
    order: number;
};

const DIR = path.join(process.cwd(), "content/galleria");

export function getOpere(): Opera[] {
    if (!fs.existsSync(DIR)) return [];

    return fs
        .readdirSync(DIR)
        .filter((f) => f.endsWith(".md"))
        .map((file) => {
            const raw = fs.readFileSync(path.join(DIR, file), "utf-8");
            const { data, content } = matter(raw.replace(/\r\n/g, "\n"));
            return {
                slug: file.replace(/\.md$/, ""),
                title: data.title ?? file.replace(/\.md$/, ""),
                image: data.image ?? "",
                description: content.trim(),
                order: Number(data.order ?? 0),
            };
        })
        .sort((a, b) => b.order - a.order); // order più alto = prima
}
