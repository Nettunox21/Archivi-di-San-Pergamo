import { cookies } from "next/headers";
import { cache } from "react";
import { createHash, randomBytes } from "crypto";
import { db, eq } from "@/lib/db";

export const SESSION_COOKIE = "sessione";
export const SESSION_DAYS = 365;

export type User = {
    username: string;
    role: string;
    avatar: string;
};

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Elenco utenti (senza password). Solo per le pagine admin. */
export async function getUsers(): Promise<User[]> {
    return db<User[]>("/utenti?select=username,role,avatar&order=username.asc");
}

/** Crea una sessione permanente e restituisce il token da mettere nel cookie. */
export async function createSession(username: string): Promise<string> {
    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString();
    await db("/sessioni", {
        method: "POST",
        prefer: "return=minimal",
        body: { token_hash: hashToken(token), username, expires_at: expires },
    });
    // pulizia sessioni scadute di questo utente
    await db(`/sessioni?username=${eq(username)}&expires_at=lt.${encodeURIComponent(new Date().toISOString())}`, {
        method: "DELETE",
        prefer: "return=minimal",
    }).catch(() => {});
    return token;
}

export async function destroySession(token: string): Promise<void> {
    await db(`/sessioni?token_hash=${eq(hashToken(token))}`, {
        method: "DELETE",
        prefer: "return=minimal",
    });
}

/** Chiude tutte le sessioni di un utente (cambio password). */
export async function destroyUserSessions(username: string): Promise<void> {
    await db(`/sessioni?username=${eq(username)}`, { method: "DELETE", prefer: "return=minimal" });
}

/** Utente loggato (o null). Dedupe per richiesta grazie a cache(). */
export const getCurrentUser = cache(async (): Promise<User | null> => {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

    try {
        const rows = await db<
            { expires_at: string; utenti: User | null }[]
        >(`/sessioni?token_hash=${eq(hashToken(token))}&select=expires_at,utenti(username,role,avatar)`);
        const row = rows?.[0];
        if (!row || !row.utenti) return null;
        if (new Date(row.expires_at).getTime() < Date.now()) return null;
        return row.utenti;
    } catch {
        return null;
    }
});
