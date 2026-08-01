// Salva questo file come: app/notizie/page.tsx

import Link from "next/link";
import { getNewsArticles } from "@/lib/notizie";
import NewsImageCarousel from "@/app/components/NewsImageCarousel";

export default function NotiziePage() {
    const articles = getNewsArticles();

    return (
        <div className="news-container">
            <div className="news-page-bg" aria-hidden="true" />

            {/* Filtro SVG per la distorsione "glitch" delle immagini in stile
                cyberpunk. E' solo una definizione, non renderizza nulla da solo:
                viene richiamato dal CSS con filter: url(#cp-distort) */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
                <defs>
                    <filter id="cp-distort" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.012 0.14"
                            numOctaves="2"
                            seed="4"
                            result="cpNoise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="cpNoise"
                            scale="22"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <header className="news-hero">
                <h1>Notizie</h1>
                <p className="news-subtitle">
                    I dispacci dell&apos;Ordine
                </p>

                <Link href="/notizie/richiedi" className="news-request-link">
                    Hai notizie da archiviare? Clicca qui!
                </Link>
            </header>

            <main className="news-main">
                {articles.length === 0 && (
                    <p className="news-empty">
                        Nessuna notizia disponibile al momento.
                    </p>
                )}

                {articles.map((a) => {
                    const isCyberpunk = a.stile === "cyberpunk";

                    return (
                        <article
                            key={a.slug}
                            className={
                                isCyberpunk
                                    ? "news-card news-card--cyberpunk"
                                    : "news-card"
                            }
                        >
                            <NewsImageCarousel images={a.images} alt={a.title} />

                            <div className="news-body">
                                <h2
                                    className="news-title"
                                    data-text={isCyberpunk ? a.title : undefined}
                                >
                                    {a.title}
                                </h2>

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
                    );
                })}
            </main>
        </div>
    );
}
