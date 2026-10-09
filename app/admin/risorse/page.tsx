"use client";
import { useEffect, useState, useCallback } from "react";
import { inParole, parseNumero } from "@/lib/numeri";

type Risorsa = { id: number; nome: string; valore: string };

export default function AdminRisorsePage() {
    const [risorse, setRisorse] = useState<Risorsa[]>([]);
    const [caricato, setCaricato] = useState(false);
    const [nome, setNome] = useState("");
    const [valore, setValore] = useState("");
    const [mod, setMod] = useState<Record<number, { nome?: string; valore?: string }>>({});
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);

    const carica = useCallback(async () => {
        const res = await fetch("/api/admin/risorse", { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data)) setRisorse(data);
        else setMsg({ testo: data?.error || "Impossibile caricare le risorse", ok: false });
        setCaricato(true);
    }, []);

    useEffect(() => { carica(); }, [carica]);

    async function invia(metodo: string, body: unknown, okMsg: string) {
        const res = await fetch("/api/admin/risorse", {
            method: metodo,
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        setMsg({ testo: res.ok ? okMsg : data.error || "Errore", ok: res.ok });
        if (res.ok) await carica();
        return res.ok;
    }

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Risorse</h1>
            <p className="admin-subtitle">
                Catalogo delle risorse dell&apos;economia: nome e valore unitario in euro. Le fazioni scelgono da qui.
            </p>

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}

            <div className="admin-card" style={{ marginBottom: 24 }}>
                <div className="admin-card-header"><span className="admin-tag">Nuova risorsa</span></div>
                <div className="admin-user-fields">
                    <div className="admin-user-field">
                        <label className="admin-user-label">Nome</label>
                        <input className="admin-user-input" value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} />
                    </div>
                    <div className="admin-user-field">
                        <label className="admin-user-label">Valore unitario (€)</label>
                        <input className="admin-user-input" inputMode="numeric" value={valore} onChange={(e) => setValore(e.target.value)} />
                        <small className="eco-sotto">{valore && parseNumero(valore) !== null ? `= ${inParole(parseNumero(valore)!)} €` : " "}</small>
                    </div>
                    <button
                        className="admin-user-save-btn"
                        disabled={!nome.trim() || parseNumero(valore) === null}
                        onClick={async () => { if (await invia("POST", { nome, valore }, "Risorsa creata")) { setNome(""); setValore(""); } }}
                    >
                        Aggiungi
                    </button>
                </div>
            </div>

            {caricato && risorse.length === 0 && <p className="admin-empty">Nessuna risorsa nel catalogo.</p>}

            <div className="admin-list">
                {risorse.map((r) => {
                    const m = mod[r.id] ?? {};
                    const v = m.valore ?? r.valore;
                    const n = m.nome ?? r.nome;
                    const cambiato = n !== r.nome || v !== r.valore;
                    return (
                        <div key={r.id} className="admin-card">
                            <div className="admin-card-header">
                                <span className="admin-user">{r.nome}</span>
                                <span className="admin-date">{inParole(parseNumero(r.valore) ?? 0n)} € l&apos;una</span>
                                <button
                                    className="admin-delete-btn"
                                    onClick={() => { if (confirm(`Eliminare "${r.nome}"?`)) invia("DELETE", { id: r.id }, "Risorsa eliminata"); }}
                                >
                                    Elimina
                                </button>
                            </div>
                            <div className="admin-user-fields">
                                <div className="admin-user-field">
                                    <label className="admin-user-label">Nome</label>
                                    <input className="admin-user-input" value={n} maxLength={80} onChange={(e) => setMod({ ...mod, [r.id]: { ...m, nome: e.target.value } })} />
                                </div>
                                <div className="admin-user-field">
                                    <label className="admin-user-label">Valore unitario (€)</label>
                                    <input className="admin-user-input" inputMode="numeric" value={v} onChange={(e) => setMod({ ...mod, [r.id]: { ...m, valore: e.target.value } })} />
                                </div>
                                <button
                                    className="admin-user-save-btn"
                                    disabled={!cambiato || !n.trim() || parseNumero(v) === null}
                                    onClick={async () => {
                                        if (await invia("PATCH", { id: r.id, nome: n, valore: v }, "Risorsa aggiornata")) {
                                            setMod((p) => { const c = { ...p }; delete c[r.id]; return c; });
                                        }
                                    }}
                                >
                                    Salva
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
