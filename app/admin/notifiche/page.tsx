"use client";
import { useEffect, useState, useCallback } from "react";
import { fazioniEcon } from "@/lib/fazioni";

type Stato = { configurato: boolean; dispositivi: number; utenti: number };
type Chiavi = { pubblica: string; privata: string };

export default function AdminNotifichePage() {
    const [stato, setStato] = useState<Stato | null>(null);
    const [utenti, setUtenti] = useState<string[]>([]);
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);
    const [occupato, setOccupato] = useState(false);
    const [chiavi, setChiavi] = useState<Chiavi | null>(null);

    const [titolo, setTitolo] = useState("");
    const [testo, setTesto] = useState("");
    const [link, setLink] = useState("");
    const [destTipo, setDestTipo] = useState<"tutti" | "fazione" | "utente">("tutti");
    const [destValore, setDestValore] = useState("");

    const carica = useCallback(async () => {
        const [s, u] = await Promise.all([
            fetch("/api/admin/notifiche", { credentials: "include" }),
            fetch("/api/users", { credentials: "include" }),
        ]);
        const ds = await s.json().catch(() => null);
        if (s.ok && ds) setStato(ds);
        else setMsg({ testo: ds?.error || "Impossibile leggere lo stato (hai eseguito push.sql su Supabase?)", ok: false });
        const du = await u.json().catch(() => null);
        if (u.ok && Array.isArray(du)) setUtenti(du.map((x: { username: string }) => x.username));
    }, []);

    useEffect(() => { carica(); }, [carica]);

    async function generaChiavi() {
        setOccupato(true);
        try {
            const res = await fetch("/api/admin/notifiche/chiavi", { method: "POST", credentials: "include" });
            const d = await res.json().catch(() => null);
            if (res.ok && d) setChiavi(d);
            else setMsg({ testo: d?.error || "Errore", ok: false });
        } finally {
            setOccupato(false);
        }
    }

    async function invia() {
        setOccupato(true);
        setMsg(null);
        try {
            const res = await fetch("/api/admin/notifiche", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ titolo, testo, link, destTipo, destValore: destTipo === "tutti" ? null : destValore }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) { setMsg({ testo: d.error || "Errore", ok: false }); return; }

            if (d.dispositivi === 0) {
                setMsg({ testo: "Nessun dispositivo iscritto tra i destinatari: nessuna notifica inviata.", ok: false });
            } else {
                const extra = [d.scaduti ? `${d.scaduti} non più validi, rimossi` : "", d.errori ? `${d.errori} non raggiungibili` : ""].filter(Boolean).join(", ");
                setMsg({ testo: `Inviata a ${d.inviati} su ${d.dispositivi} dispositivi${extra ? ` (${extra})` : ""}.`, ok: d.inviati > 0 });
                if (d.inviati > 0) { setTitolo(""); setTesto(""); setLink(""); }
            }
            carica();
        } finally {
            setOccupato(false);
        }
    }

    const pronto = titolo.trim() && (destTipo === "tutti" || destValore);

    return (
        <div className="admin-wrapper">
            <a href="/admin" className="admin-back">← Torna al pannello</a>
            <h1 className="admin-title">Notifiche sul telefono</h1>
            <p className="admin-subtitle">
                Le notifiche vengono recapitate ai telefoni iscritti e non vengono salvate: qui non resta nessuno storico.
            </p>

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}

            {stato && (
                <div className="admin-card" style={{ marginBottom: 24 }}>
                    <div className="admin-card-header">
                        <span className="admin-tag">{stato.configurato ? "Attive" : "Da configurare"}</span>
                        <span className="admin-date">{stato.dispositivi} dispositivi iscritti ({stato.utenti} utenti)</span>
                    </div>

                    {!stato.configurato && (
                        <div className="notif-config">
                            <p>Prima di inviare serve una configurazione da fare una volta sola:</p>
                            <ol className="notif-passi">
                                <li>Premi <strong>Genera chiavi</strong> qui sotto.</li>
                                <li>Su Vercel, in Settings → Environment Variables, crea le tre variabili mostrate (copia i valori esatti).</li>
                                <li>Rifai il deploy (Deployments → ⋯ → Redeploy) e ricarica questa pagina.</li>
                            </ol>
                            <button className="admin-user-save-btn" disabled={occupato} onClick={generaChiavi}>Genera chiavi</button>
                            {chiavi && (
                                <pre className="notif-chiavi">{`VAPID_PUBLIC_KEY=${chiavi.pubblica}
VAPID_PRIVATE_KEY=${chiavi.privata}
VAPID_SUBJECT=mailto:TUA-EMAIL@esempio.it`}</pre>
                            )}
                            {chiavi && <p className="eco-errore">La chiave privata è segreta: non condividerla e non metterla su GitHub. Questa schermata non la mostrerà più.</p>}
                        </div>
                    )}
                </div>
            )}

            {stato?.configurato && (
                <div className="admin-card">
                    <div className="admin-card-header"><span className="admin-tag">Nuova notifica</span></div>
                    <div className="notif-form">
                        <label>Titolo
                            <input className="admin-user-input" maxLength={80} value={titolo} onChange={(e) => setTitolo(e.target.value)} />
                        </label>
                        <label>Testo (breve, facoltativo)
                            <textarea className="admin-user-input" rows={3} maxLength={300} value={testo} onChange={(e) => setTesto(e.target.value)} />
                        </label>
                        <label>Alla pressione apre (facoltativo, es. /documenti)
                            <input className="admin-user-input" maxLength={200} placeholder="/" value={link} onChange={(e) => setLink(e.target.value)} />
                        </label>

                        <div className="notif-form-riga">
                            <label>Destinatari
                                <select className="admin-user-input" value={destTipo} onChange={(e) => { setDestTipo(e.target.value as typeof destTipo); setDestValore(""); }}>
                                    <option value="tutti">Tutti gli utenti</option>
                                    <option value="fazione">Una fazione</option>
                                    <option value="utente">Un singolo utente</option>
                                </select>
                            </label>
                            {destTipo === "fazione" && (
                                <label>Fazione
                                    <select className="admin-user-input" value={destValore} onChange={(e) => setDestValore(e.target.value)}>
                                        <option value="">Scegli…</option>
                                        {fazioniEcon.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                </label>
                            )}
                            {destTipo === "utente" && (
                                <label>Utente
                                    <select className="admin-user-input" value={destValore} onChange={(e) => setDestValore(e.target.value)}>
                                        <option value="">Scegli…</option>
                                        {utenti.map((u) => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </label>
                            )}
                        </div>

                        <button className="admin-user-save-btn" disabled={occupato || !pronto} onClick={invia}>Invia notifica</button>
                    </div>
                </div>
            )}
        </div>
    );
}
