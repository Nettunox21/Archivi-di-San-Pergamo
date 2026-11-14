"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Stato = { tipo: "idle" } | { tipo: "invio" } | { tipo: "ok"; smeraldi: number } | { tipo: "errore"; messaggio: string };

const MAX_CAROTE = 10000;

/** Smeraldi da pagare per n carote (arrotondato per eccesso). */
const smeraldiPer = (n: number, p: { smeraldi: number; carote: number }) => Math.ceil((n * p.smeraldi) / p.carote);

/** Legge un intero positivo da un campo di testo; null se vuoto o non valido. */
function leggiIntero(v: string): number | null {
    if (!/^\d+$/.test(v.trim())) return null;
    const n = Number(v);
    return n > 0 ? n : null;
}

const plurale = (n: number, uno: string, molti: string) => (n === 1 ? uno : molti);

export default function CaroteDoroClient({
    prezzo,
    scorte,
    stackSize,
    storiaHtml,
    doveHtml,
    regolamentoHtml,
    utente,
}: {
    prezzo: { smeraldi: number; carote: number };
    scorte: { stack: number; massimo: number; pieno: boolean } | null;
    stackSize: number;
    storiaHtml: string;
    doveHtml: string;
    regolamentoHtml: string;
    utente: string | null;
}) {
    // calcolatore
    const [campoCarote, setCampoCarote] = useState("32");
    const [campoSmeraldi, setCampoSmeraldi] = useState("1");

    // pop-up
    const [regolamento, setRegolamento] = useState(false);
    const [ordine, setOrdine] = useState(false);
    const [qta, setQta] = useState("32");
    const [note, setNote] = useState("");
    const [stato, setStato] = useState<Stato>({ tipo: "idle" });

    const nCarote = leggiIntero(campoCarote);
    const nSmeraldi = leggiIntero(campoSmeraldi);
    const nQta = leggiIntero(qta);
    const qtaValida = nQta !== null && nQta <= MAX_CAROTE;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setRegolamento(false);
            if (stato.tipo !== "invio") setOrdine(false);
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [stato.tipo]);

    function apriOrdine(quantita?: number) {
        if (quantita) setQta(String(Math.min(quantita, MAX_CAROTE)));
        setStato({ tipo: "idle" });
        setOrdine(true);
    }

    function chiudiOrdine() {
        if (stato.tipo === "invio") return;
        setOrdine(false);
        if (stato.tipo === "ok") setNote("");
        setStato({ tipo: "idle" });
    }

    async function invia() {
        if (!qtaValida || nQta === null) return;
        setStato({ tipo: "invio" });
        try {
            const res = await fetch("/api/aziende/carote-doro/ordine", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ carote: nQta, note }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) {
                setStato({ tipo: "errore", messaggio: j.error || "Impossibile inviare la richiesta." });
                return;
            }
            setStato({ tipo: "ok", smeraldi: j.smeraldi });
        } catch {
            setStato({ tipo: "errore", messaggio: "Connessione non riuscita. Riprova." });
        }
    }

    return (
        <>
            {/* ---- Barra azioni (resta visibile durante lo scroll) ---- */}
            <div className="cd-azioni">
                <div className="cd-azioni-in">
                    <button type="button" className="cd-rett" onClick={() => setRegolamento(true)}>
                        <span className="cd-rett-ico" aria-hidden="true">📜</span>
                        <span className="cd-rett-testo">
                            <strong>Regolamento</strong>
                            <small>Le regole della casa</small>
                        </span>
                    </button>
                    <button type="button" className="cd-rett cd-rett--ordine" onClick={() => apriOrdine()}>
                        <span className="cd-rett-ico" aria-hidden="true">🛵</span>
                        <span className="cd-rett-testo">
                            <strong>Ordina a domicilio</strong>
                            <small>Richiedi la consegna</small>
                        </span>
                    </button>
                </div>
            </div>

            <main className="cd-main">
                {/* ---- Prezzo ---- */}
                <section className="cd-prezzo">
                    <div className="cd-prezzo-eti">Il nostro prezzo</div>
                    <div className="cd-prezzo-riga">
                        <span className="cd-prezzo-num">{prezzo.smeraldi}</span>
                        <span className="cd-prezzo-unita">{plurale(prezzo.smeraldi, "smeraldo", "smeraldi")}</span>
                        <span className="cd-prezzo-uguale">=</span>
                        <span className="cd-prezzo-num">{prezzo.carote}</span>
                        <span className="cd-prezzo-unita">carote d&apos;oro</span>
                    </div>
                </section>

                {/* ---- Disponibilità ---- */}
                <section className="cd-card cd-scorte">
                    <h2 className="cd-titolo">Disponibilità</h2>
                    {scorte ? (
                        <>
                            <div
                                className="cd-quadrati"
                                role="img"
                                aria-label={`${scorte.stack}${scorte.pieno ? " o più" : ""} stack disponibili`}
                            >
                                {Array.from({ length: Math.ceil(scorte.massimo / 4) }, (_, g) => (
                                    <div className="cd-gruppo" key={g}>
                                        {Array.from({ length: 4 }, (_, k) => g * 4 + k)
                                            .filter((i) => i < scorte.massimo)
                                            .map((i) => (
                                                <span key={i} className={`cd-quadrato ${i < scorte.stack ? "cd-quadrato--acceso" : ""}`} />
                                            ))}
                                    </div>
                                ))}
                            </div>
                            <p className="cd-calc-nota">
                                {scorte.stack === 0
                                    ? "Al momento le scorte sono esaurite."
                                    : `${scorte.pieno ? `${scorte.massimo}+` : scorte.stack} ${plurale(scorte.stack, "stack", "stack")} disponibili`}
                                {" · "}1 quadrato = 1 stack ({stackSize} carote)
                            </p>
                        </>
                    ) : (
                        <p className="cd-calc-nota">La disponibilità non è consultabile al momento.</p>
                    )}
                </section>

                {/* ---- Calcolatore ---- */}
                <section className="cd-card cd-calc">
                    <h2 className="cd-titolo">Calcola il tuo ordine</h2>
                    <div className="cd-calc-griglia">
                        <label className="cd-campo">
                            <span>Carote d&apos;oro</span>
                            <input
                                inputMode="numeric"
                                value={campoCarote}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                                    setCampoCarote(v);
                                    const n = leggiIntero(v);
                                    setCampoSmeraldi(n === null ? "" : String(smeraldiPer(n, prezzo)));
                                }}
                            />
                        </label>
                        <div className="cd-calc-freccia" aria-hidden="true">⇄</div>
                        <label className="cd-campo">
                            <span>Smeraldi</span>
                            <input
                                inputMode="numeric"
                                value={campoSmeraldi}
                                onChange={(e) => {
                                    const v = e.target.value.replace(/\D/g, "").slice(0, 7);
                                    setCampoSmeraldi(v);
                                    const n = leggiIntero(v);
                                    setCampoCarote(n === null ? "" : String(Math.floor((n * prezzo.carote) / prezzo.smeraldi)));
                                }}
                            />
                        </label>
                    </div>
                    <p className="cd-calc-nota">
                        {nCarote !== null && nSmeraldi !== null
                            ? `${nCarote} carote d'oro: ${smeraldiPer(nCarote, prezzo)} ${plurale(smeraldiPer(nCarote, prezzo), "smeraldo", "smeraldi")} (arrotondato per eccesso).`
                            : "Scrivi una quantità in uno dei due campi."}
                    </p>
                    <button
                        type="button"
                        className="cd-bottone"
                        disabled={nCarote === null}
                        onClick={() => nCarote !== null && apriOrdine(nCarote)}
                    >
                        Ordina questa quantità
                    </button>
                </section>

                {/* ---- Storia e dove trovarci ---- */}
                <div className="cd-colonne">
                    {storiaHtml.trim() && (
                        <section className="cd-card cd-testo" dangerouslySetInnerHTML={{ __html: storiaHtml }} />
                    )}
                    {doveHtml.trim() && <section className="cd-card cd-testo" dangerouslySetInnerHTML={{ __html: doveHtml }} />}
                </div>
            </main>

            {/* ---- Pop-up regolamento ---- */}
            {regolamento && (
                <div className="cd-overlay" onClick={() => setRegolamento(false)}>
                    <div className="cd-modal" role="dialog" aria-modal="true" aria-label="Regolamento" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="cd-chiudi" onClick={() => setRegolamento(false)} aria-label="Chiudi">
                            ✕
                        </button>
                        {regolamentoHtml.trim() ? (
                            <div className="cd-testo" dangerouslySetInnerHTML={{ __html: regolamentoHtml }} />
                        ) : (
                            <p className="cd-nota">Il regolamento non è ancora disponibile.</p>
                        )}
                    </div>
                </div>
            )}

            {/* ---- Pop-up ordine a domicilio ---- */}
            {ordine && (
                <div className="cd-overlay" onClick={chiudiOrdine}>
                    <div className="cd-modal cd-modal--piccolo" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="cd-chiudi" onClick={chiudiOrdine} aria-label="Chiudi">
                            ✕
                        </button>

                        {stato.tipo === "ok" ? (
                            <div className="cd-esito">
                                <h3>Richiesta inviata</h3>
                                <p>
                                    Il titolare ha ricevuto la tua richiesta per <strong>{nQta} carote d&apos;oro</strong> ({stato.smeraldi}{" "}
                                    {plurale(stato.smeraldi, "smeraldo", "smeraldi")}). Ti contatterà per concordare consegna e pagamento nel mondo di gioco.
                                </p>
                                <button type="button" className="cd-bottone" onClick={chiudiOrdine}>
                                    Chiudi
                                </button>
                            </div>
                        ) : !utente ? (
                            <div className="cd-esito">
                                <h3>Accedi per continuare</h3>
                                <p>Per richiedere un ordine a domicilio devi essere registrato: la richiesta parte a nome del tuo utente.</p>
                                <Link href="/login" className="cd-bottone">
                                    Accedi
                                </Link>
                            </div>
                        ) : (
                            <div className="cd-esito">
                                <h3>Ordine a domicilio</h3>
                                <label className="cd-campo">
                                    <span>Quante carote d&apos;oro?</span>
                                    <input inputMode="numeric" value={qta} onChange={(e) => setQta(e.target.value.replace(/\D/g, "").slice(0, 5))} />
                                </label>
                                <p className="cd-calc-nota">
                                    {qtaValida && nQta !== null
                                        ? `Totale: ${smeraldiPer(nQta, prezzo)} ${plurale(smeraldiPer(nQta, prezzo), "smeraldo", "smeraldi")}.`
                                        : `Inserisci una quantità tra 1 e ${MAX_CAROTE}.`}
                                </p>
                                <label className="cd-campo">
                                    <span>Dove consegnare (facoltativo)</span>
                                    <textarea
                                        rows={2}
                                        maxLength={120}
                                        value={note}
                                        placeholder="Regno, zona o coordinate"
                                        onChange={(e) => setNote(e.target.value)}
                                    />
                                </label>
                                <p className="cd-nota">
                                    La richiesta parte a nome <strong>{utente}</strong>.
                                </p>
                                {stato.tipo === "errore" && <p className="cd-errore">{stato.messaggio}</p>}
                                <div className="cd-bottoni">
                                    <button type="button" className="cd-bottone cd-bottone--sec" onClick={chiudiOrdine} disabled={stato.tipo === "invio"}>
                                        Annulla
                                    </button>
                                    <button type="button" className="cd-bottone" onClick={invia} disabled={stato.tipo === "invio" || !qtaValida}>
                                        {stato.tipo === "invio" ? "Invio…" : "Invia richiesta"}
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
