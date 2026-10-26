import Link from "next/link";
import { getCronologia } from "@/lib/cronologia";
import type { CronologiaEvento } from "@/lib/cronologia";
import "./cronologia.css";

export const metadata = {
    title: "Linea del tempo — Archivi di San Pergamo",
};

const RUNE =
    "ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ ";

const ETICHETTE_TIPO: Record<string, string> = {
    archivio: "Archivio",
    notizia: "Notizia",
    documento: "Documento",
    altro: "Link",
};

// Cerchio come tracciato per il testo: parte da sinistra e gira in senso orario
function cerchio(r: number) {
    return `M 500,500 m -${r},0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`;
}

/* Sfondo provvisorio: anello con rune (Unicode) che ruota con lo scroll */
function Anello() {
    const r1 = 440;
    const r2 = 340;
    return (
        <div className="cron-ring" aria-hidden="true">
            <svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
                <g className="cron-ring-fisso">
                    <circle cx="500" cy="500" r="480" />
                    <circle cx="500" cy="500" r="400" />
                    <circle cx="500" cy="500" r="290" />
                    <circle cx="500" cy="500" r="240" className="cron-ring-sottile" />
                </g>

                <g className="cron-ring-a">
                    <circle cx="500" cy="500" r="385" className="cron-ring-tacche" />
                    <defs>
                        <path id="cron-path-a" d={cerchio(r1)} />
                    </defs>
                    <text className="cron-runa-grande">
                        <textPath
                            href="#cron-path-a"
                            textLength={2 * Math.PI * r1 - 4}
                            lengthAdjust="spacing"
                        >
                            {RUNE.repeat(3)}
                        </textPath>
                    </text>
                </g>

                <g className="cron-ring-b">
                    <defs>
                        <path id="cron-path-b" d={cerchio(r2)} />
                    </defs>
                    <text className="cron-runa-piccola">
                        <textPath
                            href="#cron-path-b"
                            textLength={2 * Math.PI * r2 - 4}
                            lengthAdjust="spacing"
                        >
                            {RUNE.repeat(2)}
                        </textPath>
                    </text>
                </g>
            </svg>
        </div>
    );
}

function Scheda({ ev }: { ev: CronologiaEvento }) {
    const contenuto = (
        <>
            {ev.tipo && (
                <span className={`cron-tipo cron-tipo--${ev.tipo}`}>
                    {ETICHETTE_TIPO[ev.tipo]}
                </span>
            )}
            <h3 className="cron-titolo">{ev.titolo}</h3>
            {ev.descrizione && <p className="cron-desc">{ev.descrizione}</p>}
            {ev.href && <span className="cron-vai">Apri →</span>}
        </>
    );

    if (!ev.href) return <div className="cron-card">{contenuto}</div>;

    if (ev.esterno) {
        return (
            <a
                href={ev.href}
                className="cron-card cron-card--link"
                target="_blank"
                rel="noopener noreferrer"
            >
                {contenuto}
            </a>
        );
    }

    return (
        <Link href={ev.href} className="cron-card cron-card--link">
            {contenuto}
        </Link>
    );
}

export default function CronologiaPage() {
    const cron = getCronologia();
    const totale = cron.ere.reduce((n, e) => n + e.eventi.length, 0);

    return (
        <div className="cron-page">
            <Anello />

            <header className="cron-hero">
                <h1>{cron.titolo}</h1>
                {cron.sottotitolo && <p>{cron.sottotitolo}</p>}
            </header>

            {totale === 0 ? (
                <p className="cron-vuota">
                    Nessun evento: aggiungi delle righe in <code>content/cronologia.md</code>.
                </p>
            ) : (
                <main className="cron-timeline">
                    {cron.ere.map((era, i) => (
                        <section className="cron-era" key={`${era.titolo}-${i}`}>
                            {era.titolo && (
                                <div className="cron-era-testa">
                                    <h2 className="cron-era-titolo">{era.titolo}</h2>
                                    {era.descrizione && (
                                        <p className="cron-era-desc">{era.descrizione}</p>
                                    )}
                                </div>
                            )}

                            <ol className="cron-list">
                                {era.eventi.map((ev, j) => (
                                    <li className="cron-item" key={`${ev.titolo}-${j}`}>
                                        <span className="cron-dot" aria-hidden="true" />
                                        {ev.etichetta && (
                                            <div className="cron-etichetta">{ev.etichetta}</div>
                                        )}
                                        <Scheda ev={ev} />
                                    </li>
                                ))}
                            </ol>
                        </section>
                    ))}
                </main>
            )}
        </div>
    );
}
