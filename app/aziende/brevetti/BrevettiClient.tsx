"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { classeStato } from "./stato";

export type BrevettoLista = {
    slug: string;
    codice: string;
    titolo: string;
    inventore: string;
    fazione: string;
    data: string;
    categoria: string;
    stato: string;
    estratto: string;
};

function valoriUnici(lista: BrevettoLista[], campo: keyof BrevettoLista): string[] {
    return Array.from(new Set(lista.map((b) => b[campo]).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "it")
    );
}

export default function BrevettiClient({ brevetti }: { brevetti: BrevettoLista[] }) {
    const [q, setQ] = useState("");
    const [categoria, setCategoria] = useState("");
    const [stato, setStato] = useState("");
    const [fazione, setFazione] = useState("");

    const categorie = useMemo(() => valoriUnici(brevetti, "categoria"), [brevetti]);
    const stati = useMemo(() => valoriUnici(brevetti, "stato"), [brevetti]);
    const fazioni = useMemo(() => valoriUnici(brevetti, "fazione"), [brevetti]);

    const filtrati = useMemo(() => {
        const t = q.trim().toLowerCase();
        return brevetti.filter((b) => {
            if (categoria && b.categoria !== categoria) return false;
            if (stato && b.stato !== stato) return false;
            if (fazione && b.fazione !== fazione) return false;
            if (!t) return true;
            return [b.codice, b.titolo, b.inventore, b.fazione, b.categoria, b.estratto]
                .join(" ")
                .toLowerCase()
                .includes(t);
        });
    }, [brevetti, q, categoria, stato, fazione]);

    const filtriAttivi = q || categoria || stato || fazione;

    return (
        <div className="sci-layout">
            <aside className="sci-filtri">
                <div>
                    <label htmlFor="sci-q">Ricerca</label>
                    <input
                        id="sci-q"
                        type="search"
                        placeholder="Codice, titolo, inventore…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="sci-cat">Categoria</label>
                    <select id="sci-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                        <option value="">Tutte</option>
                        {categorie.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sci-stato">Stato</label>
                    <select id="sci-stato" value={stato} onChange={(e) => setStato(e.target.value)}>
                        <option value="">Tutti</option>
                        {stati.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sci-faz">Fazione</label>
                    <select id="sci-faz" value={fazione} onChange={(e) => setFazione(e.target.value)}>
                        <option value="">Tutte</option>
                        {fazioni.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                {filtriAttivi && (
                    <button
                        type="button"
                        className="sci-reset"
                        onClick={() => {
                            setQ("");
                            setCategoria("");
                            setStato("");
                            setFazione("");
                        }}
                    >
                        Azzera filtri
                    </button>
                )}
            </aside>

            <section>
                <p className="sci-conteggio">
                    {filtrati.length} di {brevetti.length} brevetti
                </p>

                {filtrati.length === 0 ? (
                    <div className="sci-vuoto">Nessun brevetto corrisponde alla ricerca.</div>
                ) : (
                    <div className="sci-lista">
                        {filtrati.map((b) => (
                            <Link key={b.slug} href={`/aziende/brevetti/${encodeURIComponent(b.slug)}`} className="sci-voce">
                                <div className="sci-voce-testa">
                                    <span className="sci-codice">{b.codice}</span>
                                    {b.stato && <span className={classeStato(b.stato)}>{b.stato}</span>}
                                </div>
                                <div className="sci-voce-titolo">{b.titolo}</div>
                                <div className="sci-voce-meta">
                                    {[b.inventore, b.fazione, b.categoria, b.data].filter(Boolean).join(" · ")}
                                </div>
                                {b.estratto && <div className="sci-voce-estratto">{b.estratto}</div>}
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
