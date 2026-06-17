import fs from "fs";
import path from "path";
import Link from "next/link";

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

            </main>
        </div>
    );
}
