"use client";
import { useEffect, useState, useCallback } from "react";
import { fazioniEcon } from "@/lib/fazioni";

type Riga = { username: string; fazione: string; ruolo: string };
const RUOLI = [
    { id: "sovrano", nome: "Sovrano" },
    { id: "vice", nome: "Vice" },
    { id: "civile", nome: "Civile" },
];

export default function AdminAppartenenzePage() {
    const [righe, setRighe] = useState<Riga[]>([]);
    const [utenti, setUtenti] = useState<string[]>([]);
    const [utente, setUtente] = useState("");
    const [fazione, setFazione] = useState("");
    const [ruolo, setRuolo] = useState("civile");
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);

    const carica = useCallback(async () => {
        const res = await fetch("/api/admin/appartenenze", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (res.ok && data) { setRighe(data.appartenenze); setUtenti(data.utenti); }
        else setMsg({ testo: data?.error || "Impossibile caricare i dati", ok: false });
    }, []);

    useEffect(() => { carica(); }, [carica]);

    async function invia(metodo: string, body: unknown, okMsg: string) {
        const res = await fetch("/api/admin/appartenenze", {
            method: metodo,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        setMsg({ testo: res.ok ? okMsg : data.error || "Errore", ok: res.ok });
        if (res.ok) await carica();
    }

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Appartenenze alle fazioni</h1>
            <p className="admin-subtitle">
                Ogni utente può appartenere a più fazioni, con un ruolo per ciascuna. Sovrano e vice possono modificare l&apos;economia; il civile solo consultarla.
            </p>

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}

            <div className="admin-card" style={{ marginBottom: 24 }}>
                <div className="admin-card-header"><span className="admin-tag">Assegna o cambia ruolo</span></div>
                <div className="admin-user-fields">
                    <div className="admin-user-field">
                        <label className="admin-user-label">Utente</label>
                        <select className="admin-user-input" value={utente} onChange={(e) => setUtente(e.target.value)}>
                            <option value="">Scegli…</option>
                            {utenti.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Fazione</label>
                        <select className="admin-user-input" value={fazione} onChange={(e) => setFazione(e.target.value)}>
                            <option value="">Scegli…</option>
                            {fazioniEcon.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Ruolo</label>
                        <select className="admin-user-input" value={ruolo} onChange={(e) => setRuolo(e.target.value)}>
                            {RUOLI.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                        </select>
                    </div>
                    <button
                        className="admin-user-save-btn"
                        disabled={!utente || !fazione}
                        onClick={() => invia("POST", { username: utente, fazione, ruolo }, "Salvato")}
                    >
                        Salva
                    </button>
                </div>
            </div>

            <div className="admin-list">
                {fazioniEcon.map((f) => {
                    const membri = righe.filter((r) => r.fazione === f.id);
                    return (
                        <div key={f.id} className="admin-card">
                            <div className="admin-card-header">
                                <span className="admin-tag">{f.name}</span>
                                <span className="admin-date">{membri.length} {membri.length === 1 ? "membro" : "membri"}</span>
                            </div>
                            {membri.length === 0 && <p className="admin-empty">Nessun membro.</p>}
                            {membri.map((m) => (
                                <div key={m.username} className="eco-riga-membro">
                                    <span className="admin-user">{m.username}</span>
                                    <select
                                        className="admin-user-input"
                                        value={m.ruolo}
                                        onChange={(e) => invia("POST", { username: m.username, fazione: f.id, ruolo: e.target.value }, "Ruolo aggiornato")}
                                    >
                                        {RUOLI.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                                    </select>
                                    <button
                                        className="admin-delete-btn"
                                        onClick={() => invia("DELETE", { username: m.username, fazione: f.id }, "Rimosso dalla fazione")}
                                    >
                                        Rimuovi
                                    </button>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
