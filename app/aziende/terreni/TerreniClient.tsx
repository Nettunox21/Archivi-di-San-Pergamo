"use client";

import { useState } from "react";
import type { NazioneTerreni } from "@/lib/aziende-dati";

type Risultato = { nazione: string; zona: string; zone: NazioneTerreni["zone"] };

export default function TerreniClient({ nazioni }: { nazioni: NazioneTerreni[] }) {
    const [nazione, setNazione] = useState("");
    const [zona, setZona] = useState("");
    const [risultato, setRisultato] = useState<Risultato | null>(null);

    const nazioneScelta = nazioni.find((n) => n.nome === nazione);

    function cerca(e: React.FormEvent) {
        e.preventDefault();
        if (!nazioneScelta) return;
        const zone = zona
            ? nazioneScelta.zone.filter((z) => z.nome === zona)
            : nazioneScelta.zone;
        setRisultato({ nazione, zona, zone });
    }

    const totale = risultato ? risultato.zone.reduce((n, z) => n + z.terreni.length, 0) : 0;

    return (
        <>
            <div className="imm-search">
                <form className="imm-search-box" onSubmit={cerca}>
                    <div className="imm-field">
                        <label htmlFor="imm-nazione">Nazione</label>
                        <select
                            id="imm-nazione"
                            value={nazione}
                            onChange={(e) => {
                                setNazione(e.target.value);
                                setZona("");
                                setRisultato(null);
                            }}
                        >
                            <option value="">Seleziona una nazione</option>
                            {nazioni.map((n) => (
                                <option key={n.nome} value={n.nome}>
                                    {n.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="imm-field">
                        <label htmlFor="imm-zona">Zona</label>
                        <select
                            id="imm-zona"
                            value={zona}
                            disabled={!nazioneScelta}
                            onChange={(e) => {
                                setZona(e.target.value);
                                setRisultato(null);
                            }}
                        >
                            <option value="">Tutte le zone</option>
                            {nazioneScelta?.zone.map((z) => (
                                <option key={z.nome} value={z.nome}>
                                    {z.nome}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="imm-btn" disabled={!nazioneScelta}>
                        Cerca terreni
                    </button>
                </form>
            </div>

            <main className="imm-main">
                {!risultato && (
                    <p className="imm-vuoto">
                        Scegli una nazione (e, se vuoi, una zona) per vedere i terreni disponibili.
                    </p>
                )}

                {risultato && (
                    <>
                        <h2 className="imm-risultati-titolo">
                            {totale} {totale === 1 ? "terreno" : "terreni"} a {risultato.nazione}
                            {risultato.zona ? `, zona ${risultato.zona}` : ""}
                        </h2>

                        {totale === 0 && (
                            <p className="imm-vuoto">Nessun terreno disponibile in questa ricerca.</p>
                        )}

                        {risultato.zone
                            .filter((z) => z.terreni.length > 0)
                            .map((z) => (
                                <section key={z.nome} className="imm-zona">
                                    <div className="imm-zona-testa">
                                        <h3 className="imm-zona-nome">{z.nome}</h3>
                                        {z.coordinate && (
                                            <span className="imm-zona-coord">📍 {z.coordinate}</span>
                                        )}
                                    </div>
                                    <div className="imm-lista">
                                        {z.terreni.map((t, i) => (
                                            <article key={`${t.nome}-${i}`} className="imm-card">
                                                <div className="imm-card-icona">🏞️</div>
                                                <div className="imm-card-corpo">
                                                    <div className="imm-card-nome">{t.nome}</div>
                                                    {t.nota && <div className="imm-card-meta">{t.nota}</div>}
                                                </div>
                                                {t.prezzo && (
                                                    <div className="imm-card-prezzo">
                                                        <small>Prezzo</small>
                                                        {t.prezzo}
                                                    </div>
                                                )}
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            ))}
                    </>
                )}
            </main>
        </>
    );
}
