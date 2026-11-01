import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { leggiAccesso, puoVedere } from "@/lib/accesso";
import { getCurrentUser } from "@/auth/users";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    const dir = path.join(process.cwd(), "content/archivio");
    const files = fs.readdirSync(dir);

    const user = await getCurrentUser();

    const results = files
        .map((file) => {
            const slug = file.replace(".md", "");
            const filePath = path.join(dir, file);
            const raw = fs.readFileSync(filePath, "utf8");

            // Le pagine riservate non compaiono nei risultati (né titolo né contenuto)
            if (!puoVedere(leggiAccesso(raw), user)) return null;

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
