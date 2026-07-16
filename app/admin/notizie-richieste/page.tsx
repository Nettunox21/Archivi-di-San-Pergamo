// Salva questo file come: app/admin/notizie-richieste/page.tsx

"use client";

import { useEffect, useState } from "react";

interface NewsRequest {
    id: string;
    created_at: string;
    argomento: string;
    dettagli: string;
    username: string;
}

export default function NotizieRichiestePage() {
    const [requests, setRequests] = useState<NewsRequest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/notizie/richiedi")
            .then((res) => res.json())
            .then((data) => {
                setRequests(Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    async function handleDelete(id: string) {
        setRequests((prev) => prev.filter((r) => r.id !== id));

        await fetch("/api/notizie/richiedi", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
        });
    }

    return (
        <div className="admin-requests-wrapper">
            <h1 className="admin-title">Richieste di articoli</h1>

            {loading && <p>Caricamento...</p>}
            {!loading && requests.length === 0 && (
                <p>Nessuna richiesta al momento.</p>
            )}

            <div className="admin-requests-list">
                {requests.map((r) => (
                    <div key={r.id} className="admin-request-card">
                        <div className="admin-request-header">
                            <strong>{r.argomento}</strong>
                            <button
                                onClick={() => handleDelete(r.id)}
                                className="admin-request-delete"
                            >
                                Elimina
                            </button>
                        </div>
                        <p className="admin-request-details">{r.dettagli}</p>
                        <div className="admin-request-meta">
                            <span>{r.username}</span>
                            <span>
                                {new Date(r.created_at).toLocaleDateString("it-IT")}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
