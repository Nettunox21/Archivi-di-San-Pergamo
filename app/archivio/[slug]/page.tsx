import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { parseWiki } from "@/lib/markdown";
import { leggiAccesso, puoVedere } from "@/lib/accesso";
import { getCurrentUser } from "@/auth/users";
import GalleriaControls from "@/app/components/GalleriaControls";
import "../galleria.css";

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

    // Controllo accesso: il contenuto non viene nemmeno elaborato se non autorizzato
    const accesso = leggiAccesso(markdown);
    if (accesso !== null) {
        const user = await getCurrentUser();
        if (!puoVedere(accesso, user)) {
            return (
                <div className="wiki-container" style={{ textAlign: "center" }}>
                    <h1>Pagina riservata</h1>
                    <p className="wiki-subtitle">
                        {user
                            ? "Il tuo account non ha accesso a questa pagina."
                            : "Accedi per verificare se hai accesso a questa pagina."}
                    </p>
                    <div style={{ marginTop: 24 }}>
                        {!user && (
                            <Link href="/login" className="btn">
                                Accedi
                            </Link>
                        )}
                    </div>
                </div>
            );
        }
    }

    const html = parseWiki(markdown);

    // parseWiki() restituisce già l'intero markup, incluso
    // <div class="wiki-layout"><article class="markdown-content">...</article></div>.
    // Niente wrapper qui, altrimenti si annida due volte (bug del doppio wiki-layout).
    return (
        <>
            <div dangerouslySetInnerHTML={{ __html: html }} />
            <GalleriaControls />
        </>
    );
}
