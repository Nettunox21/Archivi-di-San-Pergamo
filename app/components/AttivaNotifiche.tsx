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

type Fallimento = { passo: string; nome: string; dettaglio: string };

class PassoFallito extends Error {
    passo: string;
    originale: unknown;
    constructor(passo: string, originale: unknown) {
        super(passo);
        this.passo = passo;
        this.originale = originale;
    }
}

function descrivi(e: unknown): { nome: string; dettaglio: string } {
    const orig = e instanceof PassoFallito ? e.originale : e;
    if (orig instanceof Error) return { nome: orig.name, dettaglio: orig.message };
    return { nome: "Errore", dettaglio: String(orig) };
}

/** Spiegazione in italiano, in base al passo che si è fermato e al tipo di errore. */
function spiega(f: Fallimento): string {
    if (f.passo === "service worker")
        return "Il service worker del sito non è ancora attivo. Chiudi e riapri il sito (o ricarica la pagina) e riprova.";
    if (f.passo === "chiave")
        return "Non riesco a leggere la configurazione delle notifiche dal sito. Controlla la connessione e riprova.";
    if (f.passo === "registrazione sul sito")
        return "Il telefono si è iscritto, ma il sito non ha potuto registrare il dispositivo. Riprova tra poco.";
    if (f.nome === "NotAllowedError") return "Il permesso per le notifiche è stato negato o revocato nelle impostazioni del browser.";
    if (f.nome === "InvalidAccessError" || /applicationServerKey/i.test(f.dettaglio))
        return "La chiave delle notifiche configurata sul sito non viene accettata dal browser. L'amministratore deve controllare le variabili su Vercel.";
    if (f.nome === "AbortError" || /push service/i.test(f.dettaglio))
        return "Il browser non riesce a collegarsi al servizio che recapita le notifiche (Google, Apple o Mozilla). Succede con browser che non usano i servizi Google per le notifiche (per esempio Brave, Opera o Vivaldi su computer), con telefoni senza servizi Google, oppure con VPN, blocchi di rete o adblock. Prova con Chrome.";
    if (f.nome === "InvalidStateError") return "C'è una vecchia iscrizione bloccata su questo dispositivo. Riprova tra un momento.";
    if (f.nome === "NotSupportedError") return "Questo browser non supporta le notifiche push.";
    return "Non è stato possibile attivare le notifiche su questo dispositivo.";
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
    const [fallimento, setFallimento] = useState<Fallimento | null>(null);
    const [dettagli, setDettagli] = useState("");

    const controlla = useCallback(async () => {
        const base = [
            `browser: ${navigator.userAgent}`,
            `service worker supportato: ${"serviceWorker" in navigator}`,
            `push supportato: ${"PushManager" in window}`,
            `permesso notifiche: ${"Notification" in window ? Notification.permission : "n/d"}`,
        ];
        try {
            const r = await navigator.serviceWorker?.getRegistration();
            base.push(`service worker registrato: ${r ? (r.active ? "attivo" : "non ancora attivo") : "no"}`);
        } catch {
            base.push("service worker registrato: errore di lettura");
        }
        setDettagli(base.join("\n"));

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
        setFallimento(null);
        let passo = "permesso";
        try {
            const permesso = await Notification.requestPermission();
            if (permesso !== "granted") {
                setStato(permesso === "denied" ? "negato" : "disattivo");
                return;
            }

            passo = "chiave";
            let chiave: string | null = null;
            try {
                chiave = (await fetch("/api/push/chiave", { cache: "no-store" }).then((r) => r.json())).chiave;
            } catch (e) {
                throw new PassoFallito("chiave", e);
            }
            if (!chiave) {
                setMsg({ testo: "Le notifiche non sono ancora attive sul sito: l'amministratore deve completare la configurazione.", ok: false });
                return;
            }

            passo = "service worker";
            const reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise<never>((_, rifiuta) => setTimeout(() => rifiuta(new Error("service worker non attivo dopo 8 secondi")), 8000)),
            ]).catch((e) => {
                throw new PassoFallito("service worker", e);
            });

            passo = "iscrizione push";
            const opzioni = { userVisibleOnly: true, applicationServerKey: chiaveInBytes(chiave) };
            let sub: PushSubscription;
            try {
                sub = await reg.pushManager.subscribe(opzioni);
            } catch (primo) {
                // iscrizione precedente con un'altra chiave: si toglie e si riprova
                try {
                    await (await reg.pushManager.getSubscription())?.unsubscribe();
                    sub = await reg.pushManager.subscribe(opzioni);
                } catch {
                    throw new PassoFallito("iscrizione push", primo);
                }
            }

            passo = "registrazione sul sito";
            const res = await registra(sub).catch((e) => {
                throw new PassoFallito("registrazione sul sito", e);
            });
            if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                await sub.unsubscribe();
                setMsg({ testo: d.error || "Non sono riuscito a registrare il dispositivo", ok: false });
                return;
            }
            setStato("attivo");
            setMsg({ testo: "Notifiche attivate su questo dispositivo.", ok: true });
        } catch (e) {
            const { nome, dettaglio } = descrivi(e);
            setFallimento({ passo: e instanceof PassoFallito ? e.passo : passo, nome, dettaglio });
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

            {fallimento && (
                <div className="eco-errore" role="alert">
                    <p>{spiega(fallimento)}</p>
                    <p className="notif-tecnico">
                        Dettaglio tecnico — passo «{fallimento.passo}»: {fallimento.nome}
                        {fallimento.dettaglio ? ` — ${fallimento.dettaglio}` : ""}
                    </p>
                </div>
            )}

            {dettagli && (
                <details className="notif-dettagli">
                    <summary>Dettagli tecnici di questo dispositivo</summary>
                    <pre>{dettagli}</pre>
                </details>
            )}
        </div>
    );
}
