// Accesso a Supabase (REST) per login, sessioni ed economia.
// Usa la chiave "service role" (solo lato server, mai esposta al browser):
// le tabelle nuove hanno la RLS attiva e nessuna policy, quindi la chiave anon NON le può leggere.

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export class DbError extends Error {
    status: number;
    code: string;
    constructor(message: string, status: number, code = "") {
        super(message);
        this.status = status;
        this.code = code;
    }
}

type DbInit = Omit<RequestInit, "body"> & { body?: unknown; prefer?: string };

/** Chiamata REST a Supabase. `path` inizia con "/" (es. "/utenti?username=eq.mario"). */
export async function db<T = unknown>(path: string, init: DbInit = {}): Promise<T> {
    if (!URL_BASE || !KEY) {
        throw new DbError(
            "Variabili SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY mancanti su Vercel",
            500,
            "env"
        );
    }

    const { body, prefer, headers, ...rest } = init;
    const res = await fetch(`${URL_BASE}/rest/v1${path}`, {
        cache: "no-store",
        ...rest,
        headers: {
            apikey: KEY,
            Authorization: `Bearer ${KEY}`,
            "Content-Type": "application/json",
            Prefer: prefer ?? "return=representation",
            ...(headers || {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!res.ok) {
        let message = `Errore database (${res.status})`;
        let code = "";
        try {
            const j = await res.json();
            message = j.message || message;
            code = j.code || "";
        } catch {
            /* risposta senza JSON */
        }
        throw new DbError(message, res.status, code);
    }

    if (res.status === 204) return null as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
}

/** Valore sicuro da inserire in un filtro PostgREST: eq.<valore> */
export const eq = (v: string | number) => `eq.${encodeURIComponent(String(v))}`;
