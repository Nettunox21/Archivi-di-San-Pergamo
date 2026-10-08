// Salva questo file come: app/components/NotizieClient.tsx

"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NewsImageCarousel from "@/app/components/NewsImageCarousel";
import type { NewsArticle } from "@/lib/notizie";

function Cards({
    articles,
    secret,
}: {
    articles: NewsArticle[];
    secret: boolean;
}) {
    return (
        <main className="news-main">
            {articles.length === 0 && (
                <p className="news-empty">
                    {secret
                        ? "Nessun fascicolo segreto è stato ancora recuperato."
                        : "Nessuna notizia disponibile al momento."}
                </p>
            )}

            {articles.map((a) => {
                // Nella sezione segreta lo stile occulto ha la precedenza
                // sul cyberpunk, per non mischiare due grafiche diverse.
                const isCyberpunk = !secret && a.stile === "cyberpunk";

                let cls = "news-card";
                if (isCyberpunk) cls += " news-card--cyberpunk";
                if (secret) cls += " news-card--occult";

                return (
                    <Fragment key={a.slug}>
                        {/* SOLO TELEFONO: immagine intera + titolo piccolo in basso.
                            Il tocco apre la pagina dell'articolo.
                            Su PC questo blocco è nascosto dal CSS. */}
                        <Link
                            href={`/notizie/${encodeURIComponent(a.slug)}`}
                            className={
                                secret ? "news-tile news-tile--occult" : "news-tile"
                            }
                        >
                            <Image
                                src={a.images[0]}
                                alt={a.title}
                                width={0}
                                height={0}
                                sizes="100vw"
                                className="news-tile-img"
                            />
                            <span className="news-tile-title">{a.title}</span>
                        </Link>

                        {/* SOLO PC: la card completa di sempre.
                            Su telefono è nascosta dal CSS. */}
                        <article className={cls}>
                            <NewsImageCarousel images={a.images} alt={a.title} />

                            <div className="news-body">
                                <h2
                                    className="news-title"
                                    data-text={isCyberpunk ? a.title : undefined}
                                >
                                    {a.title}
                                </h2>

                                <div className="news-text">
                                    {a.text
                                        .split("\n")
                                        .filter(Boolean)
                                        .map((par, i) => (
                                            <p key={i}>{par}</p>
                                        ))}
                                </div>

                                <div className="news-meta">
                                    {a.date && (
                                        <span className="news-meta-item">{a.date}</span>
                                    )}
                                    {a.location && (
                                        <span className="news-meta-item">
                                            {a.location}
                                        </span>
                                    )}
                                    {a.reporter && (
                                        <span className="news-meta-item">
                                            Reporter: {a.reporter}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </article>
                    </Fragment>
                );
            })}
        </main>
    );
}

export default function NotizieClient({
    normali,
    segreti,
}: {
    normali: NewsArticle[];
    segreti: NewsArticle[];
}) {
    const [secret, setSecret] = useState(false);
    const secretRef = useRef(false);
    const lockRef = useRef(false);

    // Se non ci sono articoli segreti, lo scroll orizzontale resta disattivato:
    // nessun visitatore finisce in una sezione vuota.
    const enabled = segreti.length > 0;

    const go = useCallback(
        (toSecret: boolean) => {
            if (!enabled || lockRef.current || toSecret === secretRef.current) {
                return;
            }
            lockRef.current = true;
            secretRef.current = toSecret;
            setSecret(toSecret);
            window.scrollTo({ top: 0, behavior: "smooth" });

            // Ricorda la sezione nell'indirizzo (#segreti): tornando indietro
            // da un articolo si riapre la sezione giusta.
            window.history.replaceState(
                window.history.state,
                "",
                toSecret
                    ? "#segreti"
                    : window.location.pathname + window.location.search
            );

            // blocco anti-rimbalzo: l'inerzia del trackpad genera molti eventi
            window.setTimeout(() => {
                lockRef.current = false;
            }, 800);
        },
        [enabled]
    );

    // Arrivando con #segreti nell'indirizzo, apri subito la sezione segreta
    useEffect(() => {
        if (enabled && window.location.hash === "#segreti") {
            secretRef.current = true;
            setSecret(true);
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;

        // Evita che lo swipe orizzontale sul trackpad/Opera faccia "indietro" nella cronologia
        const prevOverscroll = document.documentElement.style.overscrollBehaviorX;
        document.documentElement.style.overscrollBehaviorX = "none";

        // --- Rotella / trackpad: conta solo il movimento prevalentemente orizzontale
        function onWheel(e: WheelEvent) {
            if (Math.abs(e.deltaX) < 20) return;
            if (Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
            go(e.deltaX > 0); // destra = sezione segreta, sinistra = ritorno
        }

        // --- Touch (mobile): swipe orizzontale
        let startX = 0;
        let startY = 0;
        function onTouchStart(e: TouchEvent) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }
        function onTouchEnd(e: TouchEvent) {
            const dx = e.changedTouches[0].clientX - startX;
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            go(dx < 0); // dito verso sinistra = vai a destra
        }

        // --- Tastiera: frecce sinistra/destra
        function onKey(e: KeyboardEvent) {
            const t = e.target as HTMLElement | null;
            if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
            if (e.key === "ArrowRight") go(true);
            if (e.key === "ArrowLeft") go(false);
        }

        window.addEventListener("wheel", onWheel, { passive: true });
        window.addEventListener("touchstart", onTouchStart, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });
        window.addEventListener("keydown", onKey);

        return () => {
            document.documentElement.style.overscrollBehaviorX = prevOverscroll;
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchend", onTouchEnd);
            window.removeEventListener("keydown", onKey);
        };
    }, [enabled, go]);

    return (
        <div
            className={
                secret ? "news-container news-container--secret" : "news-container"
            }
        >
            <div className="news-page-bg" aria-hidden="true" />
            <div className="news-page-bg--occult" aria-hidden="true" />

            {/* Titolo: cambia contenuto e stile in base alla sezione */}
            <header
                className={secret ? "news-hero news-hero--occult" : "news-hero"}
            >
                <div key={secret ? "s" : "n"} className="news-hero-inner">
                    {secret ? (
                        <>
                            <h1>Archivi Proibiti</h1>
                            <p className="news-sigil-divider" aria-hidden="true">
                                ✦ ☽ ✦
                            </p>
                            <p className="news-subtitle">
                                Ciò che l&apos;Ordine non vuole che tu sappia
                            </p>
                            <Link href="/notizie/richiedi" className="news-request-link">
                                Hai visto qualcosa che non dovresti? Sussurralo qui
                            </Link>
                        </>
                    ) : (
                        <>
                            <h1>Notizie</h1>
                            <p className="news-subtitle">
                                I dispacci dell&apos;Ordine
                            </p>
                            <Link href="/notizie/richiedi" className="news-request-link">
                                Hai notizie da archiviare? Clicca qui!
                            </Link>
                        </>
                    )}
                </div>
            </header>

            {/* Le due sezioni stanno una accanto all'altra: scorri a destra per i complotti */}
            <div className="news-pager">
                <section
                    className={
                        secret
                            ? "news-pane news-pane--off news-pane--off-left"
                            : "news-pane"
                    }
                    aria-hidden={secret}
                >
                    <Cards articles={normali} secret={false} />
                </section>

                {enabled && (
                    <section
                        className={
                            secret
                                ? "news-pane"
                                : "news-pane news-pane--off news-pane--off-right"
                        }
                        aria-hidden={!secret}
                    >
                        <Cards articles={segreti} secret={true} />
                    </section>
                )}
            </div>

            {/* Puntini indicatori (non cliccabili): mostrano in quale sezione sei */}
            {enabled && (
                <div className="news-pager-dots" aria-hidden="true">
                    <span className={secret ? "" : "is-active"} />
                    <span className={secret ? "is-active" : ""} />
                </div>
            )}
        </div>
    );
}
