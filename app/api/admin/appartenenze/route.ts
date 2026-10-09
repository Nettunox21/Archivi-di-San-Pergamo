import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { RUOLI, trovaFazione } from "@/lib/economia";
import { leggiJson, risposta, rispostaErrore } from "@/lib/api";

async function soloAdmin() {
    const u = await getCurrentUser();
    return u && u.role === "admin" ? u : null;
}

export async function GET() {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    try {
        const [appartenenze, utenti] = await Promise.all([
            db<{ username: string; fazione: string; ruolo: string }[]>("/appartenenze?select=username,fazione,ruolo&order=username.asc"),
            db<{ username: string }[]>("/utenti?select=username&order=username.asc"),
        ]);
        return NextResponse.json({ appartenenze, utenti: utenti.map((u) => u.username) });
    } catch (e) {
        return rispostaErrore(e);
    }
}

// Aggiunge l'utente alla fazione, o ne cambia il ruolo se già presente.
export async function POST(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    const b = await leggiJson(req);
    const username = b && typeof b.username === "string" ? b.username : "";
    const fazione = b && typeof b.fazione === "string" ? b.fazione : "";
    const ruolo = b && typeof b.ruolo === "string" ? b.ruolo : "";
    if (!username || !trovaFazione(fazione) || !(RUOLI as string[]).includes(ruolo)) {
        return risposta("Dati non validi", 400);
    }

    try {
        await db("/appartenenze?on_conflict=username,fazione", {
            method: "POST",
            prefer: "resolution=merge-duplicates,return=minimal",
            body: { username, fazione, ruolo },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function DELETE(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    const b = await leggiJson(req);
    const username = b && typeof b.username === "string" ? b.username : "";
    const fazione = b && typeof b.fazione === "string" ? b.fazione : "";
    if (!username || !trovaFazione(fazione)) return risposta("Dati non validi", 400);

    try {
        await db(`/appartenenze?username=${eq(username)}&fazione=${eq(fazione)}`, {
            method: "DELETE",
            prefer: "return=minimal",
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
