import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { endpointAmmesso } from "@/lib/webpush";
import { leggiJson, risposta, rispostaErrore } from "@/lib/api";

const BASE64URL = /^[A-Za-z0-9_-]{10,200}$/;

// Iscrive (o riassegna all'utente corrente) il dispositivo che ha chiesto le notifiche.
export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);

    const b = await leggiJson(req);
    const endpoint = b && typeof b.endpoint === "string" ? b.endpoint : "";
    const keys = b && b.keys && typeof b.keys === "object" ? (b.keys as Record<string, unknown>) : {};
    const p256dh = typeof keys.p256dh === "string" ? keys.p256dh : "";
    const auth = typeof keys.auth === "string" ? keys.auth : "";

    if (!endpointAmmesso(endpoint)) return risposta("Servizio di notifiche del dispositivo non riconosciuto", 400);
    if (!BASE64URL.test(p256dh) || !BASE64URL.test(auth)) return risposta("Dati del dispositivo non validi", 400);

    try {
        // massimo 10 dispositivi per utente: oltre, il più vecchio viene tolto
        const miei = await db<{ endpoint: string }[]>(`/push_sottoscrizioni?username=${eq(user.username)}&select=endpoint&order=created_at.asc`);
        const altri = miei.filter((m) => m.endpoint !== endpoint);
        for (const vecchio of altri.slice(0, Math.max(0, altri.length - 9))) {
            await db(`/push_sottoscrizioni?endpoint=${eq(vecchio.endpoint)}`, { method: "DELETE", prefer: "return=minimal" });
        }

        await db("/push_sottoscrizioni?on_conflict=endpoint", {
            method: "POST",
            prefer: "resolution=merge-duplicates,return=minimal",
            body: { endpoint, username: user.username, p256dh, auth },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

// Disiscrive un dispositivo dell'utente corrente.
export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    const b = await leggiJson(req);
    const endpoint = b && typeof b.endpoint === "string" ? b.endpoint : "";
    if (!endpoint) return risposta("Dispositivo non valido", 400);

    try {
        await db(`/push_sottoscrizioni?endpoint=${eq(endpoint)}&username=${eq(user.username)}`, {
            method: "DELETE",
            prefer: "return=minimal",
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
