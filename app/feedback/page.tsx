"use client";
import { useState } from "react";

const TAGS = ["Errore wiki", "Pagina mancante", "Bug", "Altro"];

export default function FeedbackPage() {
    const [tag, setTag] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError("");
        if (!tag) return setError("Seleziona una categoria.");
        if (!message.trim()) return setError("Scrivi un messaggio.");

        setLoading(true);
        const res = await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag, message }),
        });
        setLoading(false);

        if (res.ok) {
            setSuccess(true);
            setTag("");
            setMessage("");
        } else {
            const data = await res.json();
            if (res.status === 401) {
                setError("Devi essere loggato per inviare un feedback.");
            } else {
                setError(data.error || "Errore durante l'invio.");
            }
        }
    }

    return (
        <>
            <div className="feedback-bg" />
            <div className="feedback-page-wrapper">
                <h1 className="feedback-title">Feedback</h1>
                <p className="feedback-subtitle">Segnala errori, pagine mancanti o bug.</p>

                {success ? (
                    <div className="feedback-card">
                        <p style={{ color: "rgba(200, 169, 110, 0.7)", textAlign: "center" }}>
                            Feedback inviato. Grazie!
                        </p>
                        <button className="feedback-btn" onClick={() => setSuccess(false)}>
                            Invia un altro
                        </button>
                    </div>
                ) : (
                    <div className="feedback-card">
                        <div className="feedback-tags">
                            {TAGS.map((t) => (
                                <button
                                    key={t}
                                    className={`feedback-tag ${tag === t ? "active" : ""}`}
                                    onClick={() => setTag(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        <textarea
                            className="feedback-textarea"
                            placeholder="Descrivi il problema... (max 500 caratteri)"
                            maxLength={500}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <div className="feedback-charcount">
                            {message.length}/500
                        </div>

                        {error && <p className="feedback-error">{error}</p>}

                        <button
                            className="feedback-btn"
                            onClick={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? "Invio..." : "Invia feedback"}
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}