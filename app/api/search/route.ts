import fs from "fs";
import path from "path";
import matter from "gray-matter";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    const dir = path.join(process.cwd(), "content/archivio");
    const files = fs.readdirSync(dir);

    const results = files
        .map((file) => {
            const slug = file.replace(".md", "");
            const filePath = path.join(dir, file);
            const raw = fs.readFileSync(filePath, "utf8");

            const { data, content } = matter(raw);

            const title = data.title || slug;

            const text = (title + " " + content).toLowerCase();

            if (text.includes(query)) {
                return {
                    slug,
                    title,
                };
            }

            return null;
        })
        .filter(Boolean);

    return Response.json(results);
}