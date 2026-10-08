// Salva questo file come: app/notizie/[slug]/page.tsx
// (la cartella si chiama proprio [slug], con le parentesi quadre)

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getNewsArticles } from "@/lib/notizie";

function findArticle(slug: string) {
    let decoded = slug;
    try {
        decoded = decodeURIComponent(slug);
    } catch {
        // slug malformato: lo usiamo così com'è
    }
    return getNewsArticles().find((a) => a.slug === decoded);
}

export function generateStaticParams() {
    return getNewsArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const article = findArticle(slug);
    return { title: article ? article.title : "Notizie" };
}

export default async function NotiziaPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const article = findArticle(slug);

    if (!article) notFound();

    const secret = article.secret;
    const paragraphs = article.text.split("\n").filter(Boolean);

    // Tabellina delle informazioni: compaiono solo i campi compilati
    const info = [
        { label: "Data", value: article.date },
        { label: "Autore", value: article.reporter },
        { label: "Luogo", value: article.location },
    ].filter((i) => i.value);

    return (
        <>
            {secret ? (
                <div
                    className="news-page-bg--occult news-page-bg--on"
                    aria-hidden="true"
                />
            ) : (
                <div className="news-page-bg" aria-hidden="true" />
            )}

            <div className={secret ? "news-detail news-detail--occult" : "news-detail"}>
                <Link
                    href={secret ? "/notizie#segreti" : "/notizie"}
                    className="news-detail-back"
                >
                    ← Notizie
                </Link>

                {/* Immagini per intero, senza ritagli */}
                <div className="news-detail-images">
                    {article.images.map((src, i) => (
                        <Image
                            key={src + i}
                            src={src}
                            alt={article.title}
                            width={0}
                            height={0}
                            sizes="(max-width: 760px) 100vw, 720px"
                            className="news-detail-img"
                            priority={i === 0}
                        />
                    ))}
                </div>

                {/* Intestazione: titolo + data / autore / luogo affiancati */}
                <header className="news-detail-head">
                    <h1 className="news-detail-title">{article.title}</h1>

                    {info.length > 0 && (
                        <dl className="news-detail-info">
                            {info.map((i) => (
                                <div key={i.label}>
                                    <dt>{i.label}</dt>
                                    <dd>{i.value}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                </header>

                {/* Articolo completo */}
                <div className="news-detail-body">
                    {paragraphs.map((par, i) => (
                        <p key={i}>{par}</p>
                    ))}
                </div>
            </div>
        </>
    );
}
