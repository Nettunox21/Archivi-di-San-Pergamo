"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PianoTT } from "@/lib/trauma-team";

type Stato = { tipo: "idle" } | { tipo: "invio" } | { tipo: "ok" } | { tipo: "errore"; messaggio: string };

/** Classe colore in base al nome del piano (Bronzo, Argento, Oro, Platino); altri nomi = neutro. */
function tema(nome: string): string {
    const n = nome.toLowerCase();
    if (n.includes("bronzo")) return "tt-bronzo";
    if (n.includes("argento")) return "tt-argento";
    if (n.includes("oro")) return "tt-oro";
    if (n.includes("platino")) return "tt-platino";
    return "tt-neutro";
}

export default function TraumaTeamClient({
    piani,
    regolamentoHtml,
    utente,
}: {
    piani: PianoTT[];
    regolamentoHtml: string;
    utente: string | null;
}) {
    const [regolamento, setRegolamento] = useState(false);
    const [conferma, setConferma] = useState(false);
    const [scelto, setScelto] = useState<string | null>(null);
    const [stato, setStato] = useState<Stato>({ tipo: "idle" });

    const selezionabili = piani.filter((p) => !p.programma);
    const programmi = piani.filter((p) => p.programma);

    // Esc chiude i pop-up
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setRegolamento(false);
            if (stato.tipo !== "invio") setConferma(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [stato.tipo]);

    async function invia() {
        if (!scelto) return;
        setStato({ tipo: "invio" });
        try {
            const res = await fetch("/api/aziende/trauma-team/abbonamento", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ piano: scelto }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                setStato({ tipo: "errore", messaggio: j.error || "Impossibile inviare la richiesta." });
                return;
            }
            setStato({ tipo: "ok" });
        } catch {
            setStato({ tipo: "errore", messaggio: "Connessione non riuscita. Riprova." });
        }
    }

    function chiudiConferma() {
        if (stato.tipo === "invio") return;
        setConferma(false);
        if (stato.tipo === "ok") setScelto(null);
        setStato({ tipo: "idle" });
    }

    return (
        <>
            {/* ---- Barra azioni (resta visibile durante lo scroll) ---- */}
            <div className="tt-azioni">
                <div className="tt-azioni-in">
                    <button type="button" className="tt-rett" onClick={() => setRegolamento(true)}>
                        <span className="tt-rett-ico" aria-hidden="true">▤</span>
                        <span className="tt-rett-testo">
                            <strong>Regolamento</strong>
                            <small>Leggi le regole dell&apos;azienda</small>
                        </span>
                    </button>

                    <button
                        type="button"
                        className={`tt-rett tt-rett--azione ${scelto ? "tt-rett--pronto" : ""}`}
                        disabled={!scelto}
                        onClick={() => setConferma(true)}
                    >
                        <span className="tt-rett-ico" aria-hidden="true">⚡</span>
                        <span className="tt-rett-testo">
                            <strong>{scelto ? `Attiva piano ${scelto}` : "Attiva abbonamento"}</strong>
                            <small>{scelto ? "Clicca per confermare" : "Seleziona prima un piano"}</small>
                        </span>
                    </button>
                </div>
            </div>

            <main className="tt-main">
                <div className="tt-titolo">
                    <h1>
                        <span>{"//"}</span> Scegli il tuo livello di copertura
                    </h1>
                </div>

                {selezionabili.length === 0 && programmi.length === 0 && (
                    <p className="tt-vuoto">Il listino è in aggiornamento.</p>
                )}

                {/* ---- Piani ---- */}
                <div className="tt-piani">
                    {selezionabili.map((p) => (
                        <button
                            type="button"
                            key={p.nome}
                            className={`tt-piano ${tema(p.nome)} ${scelto === p.nome ? "tt-piano--scelto" : ""}`}
                            onClick={() => setScelto(scelto === p.nome ? null : p.nome)}
                            aria-pressed={scelto === p.nome}
                        >
                            <span className="tt-piano-tag">{scelto === p.nome ? "SELEZIONATO" : "SELEZIONA"}</span>
                            <h2 className="tt-piano-nome">{p.nome}</h2>
                            <div className="tt-piano-prezzo">{p.prezzo || "—"}</div>
                            <div className="tt-piano-durata">
                                <small>DURATA</small> {p.durata || "—"}
                            </div>
                            {p.descrizione && <p className="tt-piano-desc">{p.descrizione}</p>}
                            {p.caratteristiche.length > 0 && (
                                <ul className="tt-piano-car">
                                    {p.caratteristiche.map((c, i) => (
                                        <li key={i}>{c}</li>
                                    ))}
                                </ul>
                            )}
                        </button>
                    ))}
                </div>

                {/* ---- Programmi (Secure your Soul) ---- */}
                {programmi.map((p) => (
                    <section key={p.nome} className="tt-programma">
                        <div className="tt-programma-testa">
                            <h2>{p.nome}</h2>
                            <div className="tt-programma-prezzo">{p.prezzo || "—"}</div>
                        </div>
                        {p.descrizione && <p>{p.descrizione}</p>}
                        {p.caratteristiche.length > 0 && (
                            <ul className="tt-piano-car">
                                {p.caratteristiche.map((c, i) => (
                                    <li key={i}>{c}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </main>

            {/* ---- Pop-up regolamento ---- */}
            {regolamento && (
                <div className="tt-overlay" onClick={() => setRegolamento(false)}>
                    <div className="tt-modal" role="dialog" aria-modal="true" aria-label="Regolamento" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="tt-chiudi" onClick={() => setRegolamento(false)} aria-label="Chiudi">
                            ✕
                        </button>
                        {regolamentoHtml.trim() ? (
                            <div className="tt-regolamento" dangerouslySetInnerHTML={{ __html: regolamentoHtml }} />
                        ) : (
                            <p className="tt-vuoto">Il regolamento non è ancora disponibile.</p>
                        )}
                    </div>
                </div>
            )}

            {/* ---- Pop-up conferma abbonamento ---- */}
            {conferma && scelto && (
                <div className="tt-overlay" onClick={chiudiConferma}>
                    <div className="tt-modal tt-modal--piccolo" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="tt-chiudi" onClick={chiudiConferma} aria-label="Chiudi">
                            ✕
                        </button>

                        {stato.tipo === "ok" ? (
                            <div className="tt-esito">
                                <h3>Richiesta inviata</h3>
                                <p>
                                    Il titolare è stato avvisato della tua richiesta per il piano <strong>{scelto}</strong>. Ti
                                    contatterà per concludere il pagamento nel mondo di gioco.
                                </p>
                                <button type="button" className="tt-bottone" onClick={chiudiConferma}>
                                    Chiudi
                                </button>
                            </div>
                        ) : !utente ? (
                            <div className="tt-esito">
                                <h3>Accedi per continuare</h3>
                                <p>Per attivare un abbonamento devi essere registrato: la richiesta parte a nome del tuo utente.</p>
                                <Link href="/login" className="tt-bottone">
                                    Accedi
                                </Link>
                            </div>
                        ) : (
                            <div className="tt-esito">
                                <h3>
                                    Attivare il piano <span className={tema(scelto)}>{scelto}</span>?
                                </h3>
                                <p>
                                    Verrà avvisato il titolare, che ti contatterà a nome <strong>{utente}</strong>.
                                </p>
                                {stato.tipo === "errore" && <p className="tt-errore">{stato.messaggio}</p>}
                                <div className="tt-bottoni">
                                    <button type="button" className="tt-bottone tt-bottone--sec" onClick={chiudiConferma} disabled={stato.tipo === "invio"}>
                                        Annulla
                                    </button>
                                    <button type="button" className="tt-bottone" onClick={invia} disabled={stato.tipo === "invio"}>
                                        {stato.tipo === "invio" ? "Invio…" : "Conferma"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
