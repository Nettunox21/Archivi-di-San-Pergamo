// Salva questo file come: app/notizie/page.tsx

import Image from "next/image";
import { getNewsArticles } from "@/lib/notizie";

export default function NotiziePage() {
    const articles = getNewsArticles();

    return (
        <div className="news-container">
            <div className="news-page-bg" aria-hidden="true" />

            <header className="news-hero">
                <h1>Notizie</h1>
                <p className="news-subtitle">
                    I dispacci dell&apos;Ordine
                </p>
            </header>

            <main className="news-main">
                {articles.length === 0 && (
                    <p className="news-empty">
                        Nessuna notizia disponibile al momento.
                    </p>
                )}

                {articles.map((a) => (
                    <article key={a.slug} className="news-card">
                        <div className="news-image-wrapper">
                            <Image
                                src={a.image}
                                alt={a.title}
                                fill
                                className="news-image"
                            />
                        </div>

                        <div className="news-body">
                            <h2 className="news-title">{a.title}</h2>
                            <hr className="news-divider" />

                            <div className="news-text">
                                {a.text.split("\n").filter(Boolean).map((par, i) => (
                                    <p key={i}>{par}</p>
                                ))}
                            </div>

                            <div className="news-meta">
                                {a.date && (
                                    <span className="news-meta-item">{a.date}</span>
                                )}
                                {a.location && (
                                    <span className="news-meta-item">{a.location}</span>
                                )}
                                {a.reporter && (
                                    <span className="news-meta-item">
                                        Reporter: {a.reporter}
                                    </span>
                                )}
                            </div>
                        </div>
                    </article>
                ))}
            </main>
        </div>
    );
}
