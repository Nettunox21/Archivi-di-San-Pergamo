import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import "../../aziende.css";
import "../brevetti.css";
import { getBrevetto, getBrevetti } from "@/lib/aziende-dati";
import { getAzienda } from "@/lib/talanton";
import { classeStato } from "../stato";

export function generateStaticParams() {
    return getBrevetti().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const b = getBrevetto(slug);
    return { title: b ? `${b.codice} · ${b.titolo}` : "Registro Brevetti" };
}

export default async function BrevettoPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const b = getBrevetto(slug);
    if (!b) notFound();

    const azienda = getAzienda("ufficio-brevetti");
    const html = marked.parse(b.corpo) as string;

    const righe: [string, string][] = [
        ["Codice", b.codice],
        ["Inventore", b.inventore],
        ["Fazione", b.fazione],
        ["Data", b.data],
        ["Categoria", b.categoria],
    ];

    return (
        <div className="az-shell sci-root">
            <header className="sci-header">
                <div className="sci-header-in">
                    <div>
                        <div className="sci-marchio">{azienda?.titolare || "SENPAI"}</div>
                        <div className="sci-titolo-sito">{azienda?.nome ?? "Registro Brevetti"}</div>
                    </div>
                    <Link href="/aziende/brevetti" className="sci-back">
                        ← Torna al registro
                    </Link>
                </div>
            </header>

            <main className="sci-main">
                <article className="sci-scheda">
                    <span className="sci-codice">{b.codice}</span>
                    <h1>{b.titolo}</h1>

                    <table className="sci-dati">
                        <tbody>
                            {righe
                                .filter(([, v]) => v)
                                .map(([k, v]) => (
                                    <tr key={k}>
                                        <th>{k}</th>
                                        <td className={k === "Codice" ? "sci-mono" : undefined}>{v}</td>
                                    </tr>
                                ))}
                            {b.stato && (
                                <tr>
                                    <th>Stato</th>
                                    <td>
                                        <span className={classeStato(b.stato)}>{b.stato}</span>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {b.immagine && (
                        <figure className="sci-figura">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.immagine} alt={b.titolo} />
                            <figcaption>Fig. 1 — {b.titolo}</figcaption>
                        </figure>
                    )}

                    {b.corpo.trim() && (
                        <>
                            <div className="sci-abstract-titolo">Descrizione</div>
                            <div className="sci-testo" dangerouslySetInnerHTML={{ __html: html }} />
                        </>
                    )}
                </article>
            </main>

            <footer className="sci-footer">
                {azienda?.titolare ? `${azienda.titolare} · ` : ""}Registro consultabile a scopo informativo
            </footer>
        </div>
    );
}
