import { NextResponse } from "next/server";
import { DbError } from "@/lib/db";

export const risposta = (error: string, status: number) => NextResponse.json({ error }, { status });

/** Traduce un errore del database in una risposta leggibile (senza svelare dettagli interni). */
export function rispostaErrore(e: unknown) {
    if (e instanceof DbError) {
        if (e.code === "23505") return risposta("Esiste già un elemento uguale", 409);
        if (e.code === "23503") return risposta("Elemento collegato ad altri dati o non esistente", 409);
        if (e.code === "23514" || e.code === "22P02") return risposta("Valore non valido", 400);
        if (e.code === "env") return risposta(e.message, 500);
        if (e.code === "PGRST205" || e.code === "42P01") return risposta("Tabelle mancanti: esegui economia.sql su Supabase", 500);
    }
    console.error(e);
    return risposta("Errore del server", 500);
}

export async function leggiJson(req: Request): Promise<Record<string, unknown> | null> {
    try {
        const b = await req.json();
        return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

export const testo = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t.length > 0 && t.length <= max ? t : null;
};

export const intero = (v: unknown): number | null => {
    const n = typeof v === "string" ? Number(v) : v;
    return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
};
