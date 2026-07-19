import fs from "fs";
import path from "path";
import Link from "next/link";
import { getDocuments } from "@/lib/documents";

function getArticles() {
    const dir = path.join(process.cwd(), "content/archivio");
    const files = fs.readdirSync(dir);

    return files
        .map((file) => {
            const filePath = path.join(dir, file);
            const stats = fs.statSync(filePath);

            return {
                slug: file.replace(".md", ""),
                created: stats.birthtimeMs,
            };
        })
        .sort((a, b) => b.created - a.created); // più recenti prima
}

// 🔧 NUOVA FUNZIONE: pulizia e formattazione titolo
function formatSlug(slug: string) {
    return slug
        .replace(/[-_]/g, " ")            // trasforma - e _ in spazio
        .replace(/[()'",.?!:;]/g, "")     // rimuove simboli
        .replace(/\s+/g, " ")            // compatta spazi multipli
        .toUpperCase()
        .trim();
}

export default function HomePage() {
    const articles = getArticles();
    const documents = getDocuments().slice(0, 3); // anteprima: solo i primi 3

    return (
        <div className="wiki-container">

            <header className="wiki-hero">
                <h1>Archivi di San Pergamo</h1>
                <p className="wiki-subtitle">
                    L’Ordine ti da il benvenuto
                </p>

                <Link href="/archivio" className="btn">
                    Esplora archivio
                </Link>
            </header>

            <main className="wiki-main">

                <section className="wiki-section">
                    <h2>Archivio recente</h2>

                    <div className="wiki-grid">
                        {articles.map((a) => (
                            <Link
                                key={a.slug}
                                href={`/archivio/${a.slug}`}
                                className="wiki-card"
                            >
                                <h3>{formatSlug(a.slug)}</h3>
                            </Link>
                        ))}
                    </div>

                </section>

                {documents.length > 0 && (
                    <section className="wiki-section">
                        <h2>Documenti</h2>

                        <div className="documenti-grid">
                            {documents.map((doc) => (
                                <Link
                                    key={doc.slug}
                                    href="/documenti"
                                    className="document-card"
                                >
                                    <div className="document-banner">
                                        {doc.image && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={doc.image} alt={doc.title} />
                                        )}
                                        <div className="document-banner-overlay" />
                                    </div>
                                    <div className="document-info">
                                        <h3 className="document-title">{doc.title}</h3>
                                        <p className="document-description">{doc.description}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        <div style={{ textAlign: "center", marginTop: 24 }}>
                            <Link href="/documenti" className="btn">
                                Vedi tutti i documenti
                            </Link>
                        </div>
                    </section>
                )}

            </main>
        </div>
    );
}
