"use client";

import { useMemo, useState } from "react";
import type { WikiDocument } from "@/lib/documents";

export default function DocumentiClient({ documents }: { documents: WikiDocument[] }) {
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<WikiDocument | null>(null);
    const [pageIndex, setPageIndex] = useState(0);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return documents;
        return documents.filter((d) =>
            (d.title + " " + d.description).toLowerCase().includes(q)
        );
    }, [documents, query]);

    function openDocument(doc: WikiDocument) {
        setSelected(doc);
        setPageIndex(0);
    }

    function closeDocument() {
        setSelected(null);
    }

    const totalPages = selected?.pages.length ?? 0;

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
                        onClick={() => openDocument(doc)}
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
                <div className="document-modal-backdrop" onClick={closeDocument}>
                    {/* Rettangolo STONDATO esterno: nessuna immagine, solo cornice/tema */}
                    <div className="document-modal" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="document-modal-close"
                            onClick={closeDocument}
                            aria-label="Chiudi documento"
                        >
                            ✕
                        </button>

                        {/* Rettangolo NORMALE interno: qui va lo sfondo */}
                        <div
                            className="document-modal-panel"
                            style={{
                                backgroundImage: selected.background
                                    ? `url(${selected.background})`
                                    : undefined,
                            }}
                        >
                            <div className="document-modal-scrim" />

                            <div className="document-modal-content">
                                <h2 className="document-modal-title">{selected.title}</h2>

                                <div
                                    className="document-modal-text"
                                    dangerouslySetInnerHTML={{
                                        __html: selected.pages[pageIndex] ?? "",
                                    }}
                                />
                            </div>

                            {totalPages > 1 && (
                                <div className="document-modal-pagination">
                                    <button
                                        onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                                        disabled={pageIndex === 0}
                                        aria-label="Pagina precedente"
                                    >
                                        ‹
                                    </button>
                                    <span>
                                        Pagina {pageIndex + 1} di {totalPages}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setPageIndex((p) => Math.min(totalPages - 1, p + 1))
                                        }
                                        disabled={pageIndex === totalPages - 1}
                                        aria-label="Pagina successiva"
                                    >
                                        ›
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
