"use client";

import { useEffect, useState, useCallback } from "react";

type Stato = "caricamento" | "non-supportato" | "ios-installa" | "negato" | "disattivo" | "attivo";

function chiaveInBytes(base64url: string): Uint8Array<ArrayBuffer> {
    const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(b64);
    const out = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

async function registra(sub: PushSubscription) {
    return fetch("/api/push/sottoscrivi", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
    });
}

export default function AttivaNotifiche() {
    const [stato, setStato] = useState<Stato>("caricamento");
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);
    const [occupato, setOccupato] = useState(false);

    const controlla = useCallback(async () => {
        const supportato = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const installata =
            window.matchMedia("(display-mode: standalone)").matches ||
            (navigator as Navigator & { standalone?: boolean }).standalone === true;

        if (!supportato) {
            setStato(ios && !installata ? "ios-installa" : "non-supportato");
            return;
        }
        if (Notification.permission === "denied") {
            setStato("negato");
            return;
        }
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
                setStato("non-supportato");
                return;
            }
            const sub = await reg.pushManager.getSubscription();
            if (sub && Notification.permission === "granted") {
                registra(sub).catch(() => {}); // riallinea il dispositivo all'utente attuale
                setStato("attivo");
            } else {
                setStato("disattivo");
            }
        } catch {
            setStato("non-supportato");
        }
    }, []);

    useEffect(() => {
        controlla();
    }, [controlla]);

    async function attiva() {
        setOccupato(true);
        setMsg(null);
        try {
            const permesso = await Notification.requestPermission();
            if (permesso !== "granted") {
                setStato(permesso === "denied" ? "negato" : "disattivo");
                return;
            }
            const { chiave } = await fetch("/api/push/chiave").then((r) => r.json());
            if (!chiave) {
                setMsg({ testo: "Le notifiche non sono ancora state attivate dall'amministratore.", ok: false });
                return;
            }
            const reg = await navigator.serviceWorker.ready;
            const opzioni = { userVisibleOnly: true, applicationServerKey: chiaveInBytes(chiave) };
            let sub: PushSubscription;
            try {
                sub = await reg.pushManager.subscribe(opzioni);
            } catch {
                // iscrizione precedente con un'altra chiave: si toglie e si riprova
                await (await reg.pushManager.getSubscription())?.unsubscribe();
                sub = await reg.pushManager.subscribe(opzioni);
            }
            const res = await registra(sub);
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                await sub.unsubscribe();
                setMsg({ testo: d.error || "Non sono riuscito a registrare il dispositivo", ok: false });
                return;
            }
            setStato("attivo");
            setMsg({ testo: "Notifiche attivate su questo dispositivo.", ok: true });
        } catch {
            setMsg({ testo: "Non è stato possibile attivare le notifiche su questo dispositivo.", ok: false });
        } finally {
            setOccupato(false);
        }
    }

    async function disattiva() {
        setOccupato(true);
        setMsg(null);
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = await reg?.pushManager.getSubscription();
            if (sub) {
                await fetch("/api/push/sottoscrivi", {
                    method: "DELETE",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                }).catch(() => {});
                await sub.unsubscribe();
            }
            setStato("disattivo");
            setMsg({ testo: "Notifiche disattivate su questo dispositivo.", ok: true });
        } finally {
            setOccupato(false);
        }
    }

    async function prova() {
        setOccupato(true);
        setMsg(null);
        try {
            const res = await fetch("/api/push/prova", { method: "POST", credentials: "include" });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) setMsg({ testo: d.error || "Errore", ok: false });
            else if (d.inviati > 0) setMsg({ testo: "Notifica di prova inviata: dovrebbe comparire tra pochi secondi.", ok: true });
            else setMsg({ testo: "Il servizio del dispositivo non ha accettato il messaggio. Riprova o riattiva le notifiche.", ok: false });
        } finally {
            setOccupato(false);
        }
    }

    return (
        <div className="notif-box">
            {stato === "caricamento" && <p className="notif-sotto">Controllo del dispositivo…</p>}

            {stato === "ios-installa" && (
                <>
                    <h2>Prima installa il sito sull&apos;iPhone</h2>
                    <p>Su iPhone le notifiche funzionano solo se il sito è sulla schermata Home:</p>
                    <ol className="notif-passi">
                        <li>Apri questo sito con Safari.</li>
                        <li>Tocca il pulsante Condividi, poi <strong>Aggiungi a Home</strong>.</li>
                        <li>Apri il sito dall&apos;icona appena creata, accedi e torna in questa pagina.</li>
                    </ol>
                </>
            )}

            {stato === "non-supportato" && (
                <p>Questo browser o dispositivo non supporta le notifiche. Prova con Chrome su Android, oppure con il sito installato sulla Home di un iPhone.</p>
            )}

            {stato === "negato" && (
                <p>Le notifiche per questo sito sono bloccate nelle impostazioni del browser o del telefono. Riattivale da lì, poi torna in questa pagina.</p>
            )}

            {stato === "disattivo" && (
                <>
                    <p>Le notifiche non sono attive su questo dispositivo.</p>
                    <button type="button" className="notif-azione notif-azione--primaria" disabled={occupato} onClick={attiva}>
                        Attiva le notifiche
                    </button>
                </>
            )}

            {stato === "attivo" && (
                <>
                    <p><strong>Le notifiche sono attive</strong> su questo dispositivo.</p>
                    <div className="notif-bottoni">
                        <button type="button" className="notif-azione" disabled={occupato} onClick={prova}>Invia una notifica di prova</button>
                        <button type="button" className="notif-azione" disabled={occupato} onClick={disattiva}>Disattiva</button>
                    </div>
                </>
            )}

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}
        </div>
    );
}
