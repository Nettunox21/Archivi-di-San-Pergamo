"use client";

import { useMemo, useState } from "react";
import type { WikiDocument } from "@/lib/documents";

export default function DocumentiClient({ documents }: { documents: WikiDocument[] }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<WikiDocument | null>(null);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return documents;
        return documents.filter((d) =>
            (d.title + " " + d.description).toLowerCase().includes(q)
        );
    }, [documents, query]);

    return (
        <div className="documenti-wrapper">
            <div className="documenti-search">
                <input
                    type="text"
                    placeholder="Cerca nei documenti..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <div className="documenti-grid">
                {filtered.map((doc) => (
                    <button
                        key={doc.slug}
                        className="document-card"
                        onClick={() => setSelected(doc)}
                    >
                        <div className="document-banner">
                            {doc.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={doc.image} alt={doc.title} />
                            )}
                            <div className="document-banner-overlay" />
                        </div>
                        <div className="document-info">
                            <h3 className="document-title">{doc.title}</h3>
                            <p className="document-description">{doc.description}</p>
                        </div>
                    </button>
                ))}

                {filtered.length === 0 && (
                    <p className="documenti-empty">Nessun documento trovato.</p>
                )}
            </div>

            {selected && (
                <div
                    className="document-modal-backdrop"
                    onClick={() => setSelected(null)}
                >
                    <div
                        className="document-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="document-modal-close"
                            onClick={() => setSelected(null)}
                            aria-label="Chiudi documento"
                        >
                            ✕
                        </button>

                        <div
                            className="document-modal-bg"
                            style={{
                                backgroundImage: selected.image
                                    ? `url(${selected.image})`
                                    : undefined,
                            }}
                        >
                            <div className="document-modal-panel">
                                <h2 className="document-modal-title">{selected.title}</h2>
                                <div
                                    className="document-modal-text"
                                    dangerouslySetInnerHTML={{ __html: selected.contentHTML }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
