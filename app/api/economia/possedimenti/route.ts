import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione, puoModificare, registra } from "@/lib/economia";
import { leggiJson, risposta, rispostaErrore, intero } from "@/lib/api";
import { parseNumero, raggruppa } from "@/lib/numeri";

// Imposta la quantità di una risorsa posseduta da una fazione (crea o aggiorna).
export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);

    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    const risorsaId = intero(b.risorsaId);
    const quantita = parseNumero(b.quantita);
    if (!trovaFazione(fazione) || !risorsaId) return risposta("Dati non validi", 400);
    if (quantita === null) return risposta("Quantità non valida (solo numeri interi, max 30 cifre)", 400);
    if (!(await puoModificare(user, fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        const ris = await db<{ nome: string }[]>(`/risorse?id=${eq(risorsaId)}&select=nome`);
        if (!ris?.[0]) return risposta("Risorsa non trovata", 404);

        await db("/possedimenti?on_conflict=fazione,risorsa_id", {
            method: "POST",
            prefer: "resolution=merge-duplicates,return=minimal",
            body: { fazione, risorsa_id: risorsaId, quantita: quantita.toString() },
        });
        await registra(user.username, fazione, "risorsa", `${ris[0].nome}: quantità impostata a ${raggruppa(quantita)}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);

    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    const risorsaId = intero(b.risorsaId);
    if (!trovaFazione(fazione) || !risorsaId) return risposta("Dati non validi", 400);
    if (!(await puoModificare(user, fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        const ris = await db<{ nome: string }[]>(`/risorse?id=${eq(risorsaId)}&select=nome`);
        await db(`/possedimenti?fazione=${eq(fazione)}&risorsa_id=${eq(risorsaId)}`, {
            method: "DELETE",
            prefer: "return=minimal",
        });
        await registra(user.username, fazione, "risorsa", `${ris?.[0]?.nome ?? "Risorsa"}: rimossa dalla fazione`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
