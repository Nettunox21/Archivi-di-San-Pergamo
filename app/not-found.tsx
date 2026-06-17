import Link from "next/link";

export default function NotFound() {
    return (
        <div className="wiki-container">

            <main className="wiki-main">

                <h1>404 — Pagina non trovata</h1>

                <blockquote>
                    La risorsa richiesta non esiste negli Archivi di San Pergamo o è stata rimossa.
                </blockquote>

                <p>
                    Controlla l’URL oppure utilizza una delle azioni disponibili.
                </p>

                <h2>Azioni disponibili</h2>
                <ul>
                    <li>
                        <Link href="/">Torna alla Home</Link>
                    </li>
                    <li>
                        <Link href="/feedback">Invia feedback</Link>
                    </li>
                </ul>

                <h2>Status del sistema</h2>
                <p>
                    Nessuna corruzione rilevata nei sistemi degli archivi.
                </p>

            </main>

        </div>
    );
}