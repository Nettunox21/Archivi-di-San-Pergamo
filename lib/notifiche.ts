import { cache } from "react";
import { db, eq } from "@/lib/db";

export type DestTipo = "tutti" | "fazione" | "utente";

export type Notifica = {
    id: number;
    titolo: string;
    testo: string;
    link: string | null;
    importante: boolean;
    destTipo: DestTipo;
    destValore: string | null;
    scadeIl: string | null;
    creatoDa: string | null;
    creatoIl: string;
    letta: boolean;
};

type Riga = {
    id: number;
    titolo: string;
    testo: string;
    link: string | null;
    importante: boolean;
    dest_tipo: DestTipo;
    dest_valore: string | null;
    scade_il: string | null;
    created_by: string | null;
    created_at: string;
    notifiche_lette?: { username: string }[];
};

const SELECT = "id,titolo,testo,link,importante,dest_tipo,dest_valore,scade_il,created_by,created_at";
const USERNAME_SICURO = /^[A-Za-z0-9_.-]{1,64}$/;

export const daRiga = (r: Riga, letta = false): Notifica => ({
    id: r.id,
    titolo: r.titolo,
    testo: r.testo,
    link: r.link,
    importante: r.importante,
    destTipo: r.dest_tipo,
    destValore: r.dest_valore,
    scadeIl: r.scade_il,
    creatoDa: r.created_by,
    creatoIl: r.created_at,
    letta,
});

/** Notifiche visibili a un utente (tutti + sue fazioni + a lui), non scadute, dalla più recente. */
export async function caricaNotificheUtente(username: string): Promise<Notifica[]> {
    if (!USERNAME_SICURO.test(username)) return [];
    try {
        const u = encodeURIComponent(username);
        const filtro = `(dest_tipo.eq.tutti,dest_tipo.eq.fazione,and(dest_tipo.eq.utente,dest_valore.eq.${u}))`;
        const [righe, fazioni] = await Promise.all([
            db<Riga[]>(
                `/notifiche?select=${SELECT},notifiche_lette(username)&notifiche_lette.username=${eq(username)}` +
                    `&or=${filtro}&order=created_at.desc&limit=100`
            ),
            db<{ fazione: string }[]>(`/appartenenze?username=${eq(username)}&select=fazione`),
        ]);
        const mie = new Set(fazioni.map((f) => f.fazione));
        const adesso = Date.now();
        return righe
            .filter((r) => (r.dest_tipo !== "fazione" || (r.dest_valore && mie.has(r.dest_valore))))
            .filter((r) => !r.scade_il || new Date(r.scade_il).getTime() > adesso)
            .map((r) => daRiga(r, (r.notifiche_lette?.length ?? 0) > 0));
    } catch {
        // tabelle non ancora create o database non raggiungibile: il sito deve funzionare lo stesso
        return [];
    }
}

/** Una sola lettura per richiesta, condivisa tra layout e pagine. */
export const notifichePerUtente = cache((username: string) => caricaNotificheUtente(username));

export const contaNonLette = (n: Notifica[]) => n.filter((x) => !x.letta).length;

/** La più recente notifica importante non ancora letta (per il banner). */
export const notificaBanner = (n: Notifica[]) => n.find((x) => x.importante && !x.letta) ?? null;
