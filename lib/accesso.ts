import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { getCurrentUser, type User } from "@/auth/users";

const DIR = path.join(process.cwd(), "content/archivio");

/**
 * Legge il campo "accesso" dal frontmatter.
 *  - null  => campo assente: pagina pubblica
 *  - []    => campo presente ma vuoto: visibile solo agli admin
 *  - [...] => nomi utente ammessi (minuscoli)
 */
export function leggiAccesso(raw: string): string[] | null {
    try {
        // tolleranza: CRLF dell'editor GitHub e "accesso:Mario" senza spazio
        const testo = raw
            .replace(/\r\n/g, "\n")
            .replace(/^accesso:(?=\S)/im, "accesso: ");
        const { data } = matter(testo);

        if (!("accesso" in data)) return null;

        const v = data.accesso;
        if (v === null || v === undefined || v === "") return [];

        const lista = Array.isArray(v) ? v : String(v).split(",");
        return lista
            .map((n) => String(n).trim().toLowerCase())
            .filter(Boolean);
    } catch {
        return null;
    }
}

/** Può vedere la pagina? Gli admin vedono sempre tutto. */
export function puoVedere(accesso: string[] | null, user: User | null): boolean {
    if (accesso === null) return true;
    if (!user) return false;
    if (user.role === "admin") return true;
    return accesso.includes(user.username.toLowerCase());
}

/** Slug delle pagine .md di content/archivio visibili all'utente attuale. */
export async function getSlugVisibili(): Promise<string[]> {
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md"));

    const info = files.map((f) => ({
        slug: f.replace(/\.md$/, ""),
        accesso: leggiAccesso(fs.readFileSync(path.join(DIR, f), "utf-8")),
    }));

    // Si interroga il login solo se esiste almeno una pagina riservata
    const serveUtente = info.some((i) => i.accesso !== null);
    const user = serveUtente ? await getCurrentUser() : null;

    return info.filter((i) => puoVedere(i.accesso, user)).map((i) => i.slug);
}
