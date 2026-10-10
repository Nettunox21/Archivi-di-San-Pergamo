import { db, eq } from "@/lib/db";
import { configVapid, inviaPush, type Sottoscrizione } from "@/lib/webpush";

export const pushConfigurato = () => configVapid() !== null;

export type Destinatari = { tipo: "tutti" } | { tipo: "fazione" | "utente"; valore: string };

const USERNAME_SICURO = /^[A-Za-z0-9_.-]{1,64}$/;

/** Dispositivi iscritti ai quali recapitare il messaggio. */
export async function trovaDispositivi(dest: Destinatari): Promise<Sottoscrizione[]> {
    const campi = "endpoint,p256dh,auth";
    if (dest.tipo === "tutti") return db<Sottoscrizione[]>(`/push_sottoscrizioni?select=${campi}`);
    if (dest.tipo === "utente") return db<Sottoscrizione[]>(`/push_sottoscrizioni?username=${eq(dest.valore)}&select=${campi}`);

    const membri = await db<{ username: string }[]>(`/appartenenze?fazione=${eq(dest.valore)}&select=username`);
    const nomi = membri.map((m) => m.username).filter((n) => USERNAME_SICURO.test(n));
    if (nomi.length === 0) return [];
    return db<Sottoscrizione[]>(`/push_sottoscrizioni?username=in.(${nomi.map(encodeURIComponent).join(",")})&select=${campi}`);
}

export type RiepilogoInvio = { dispositivi: number; inviati: number; scaduti: number; errori: number };

/** Invia a tutti i dispositivi e toglie dal database quelli che il servizio push dichiara non più validi. */
export async function inviaAi(
    dispositivi: Sottoscrizione[],
    messaggio: { title: string; body: string; url: string }
): Promise<RiepilogoInvio> {
    const cfg = configVapid();
    const r: RiepilogoInvio = { dispositivi: dispositivi.length, inviati: 0, scaduti: 0, errori: 0 };
    if (!cfg) {
        r.errori = dispositivi.length;
        return r;
    }

    for (let i = 0; i < dispositivi.length; i += 20) {
        const gruppo = dispositivi.slice(i, i + 20);
        const esiti = await Promise.all(gruppo.map((d) => inviaPush(d, messaggio, cfg)));
        for (let j = 0; j < gruppo.length; j++) {
            if (esiti[j] === "ok") r.inviati++;
            else if (esiti[j] === "scaduta") {
                r.scaduti++;
                await db(`/push_sottoscrizioni?endpoint=${eq(gruppo[j].endpoint)}`, { method: "DELETE", prefer: "return=minimal" }).catch(() => {});
            } else r.errori++;
        }
    }
    return r;
}
