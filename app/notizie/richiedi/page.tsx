// Salva questo file come: app/notizie/richiedi/page.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RichiediArticoloPage() {
    const [argomento, setArgomento] = useState("");
    const [dettagli, setDettagli] = useState("");
    const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const router = useRouter();

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus("sending");

        const res = await fetch("/api/notizie/richiedi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ argomento, dettagli }),
        });

        if (res.ok) {
            setStatus("sent");
            setTimeout(() => router.push("/notizie"), 1500);
        } else {
            setStatus("error");
        }
    }

    return (
        <div className="news-request-container">
            <h1>Richiedi un articolo</h1>
            <p>
                Segnala una notizia da archiviare. Il tuo nome utente verrà
                registrato automaticamente.
            </p>

            <form onSubmit={handleSubmit} className="news-request-form">
                <label>
                    Argomento
                    <input
                        type="text"
                        value={argomento}
                        onChange={(e) => setArgomento(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Dettagli
                    <textarea
                        value={dettagli}
                        onChange={(e) => setDettagli(e.target.value)}
                        rows={6}
                        required
                    />
                </label>

                <button type="submit" disabled={status === "sending"}>
                    {status === "sending" ? "Invio..." : "Invia richiesta"}
                </button>

                {status === "sent" && (
                    <p className="news-request-success">Richiesta inviata!</p>
                )}
                {status === "error" && (
                    <p className="news-request-error">
                        Errore, riprova (devi essere loggato).
                    </p>
                )}
            </form>
        </div>
    );
}
