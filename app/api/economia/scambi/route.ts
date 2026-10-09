import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione, puoModificare, registra } from "@/lib/economia";
import { elencoDocumenti } from "@/lib/economiaDocs";
import { leggiJson, risposta, rispostaErrore, intero, testo } from "@/lib/api";

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const fazioneA = typeof b.fazioneA === "string" ? b.fazioneA : "";
    const fazioneB = typeof b.fazioneB === "string" ? b.fazioneB : "";
    const descrizione = testo(b.descrizione, 500);
    if (!trovaFazione(fazioneA) || !trovaFazione(fazioneB)) return risposta("Fazione non valida", 400);
    if (fazioneA === fazioneB) return risposta("Scegli due fazioni diverse", 400);
    if (!descrizione) return risposta("Descrivi lo scambio (max 500 caratteri)", 400);

    const validi = new Set(elencoDocumenti().map((d) => d.slug));
    const documenti = Array.isArray(b.documenti)
        ? Array.from(new Set(b.documenti.filter((d): d is string => typeof d === "string" && validi.has(d)))).slice(0, 10)
        : [];

    if (!(await puoModificare(user, fazioneA)) && !(await puoModificare(user, fazioneB))) {
        return risposta("Non hai i permessi per questa fazione", 403);
    }

    try {
        await db("/scambi", {
            method: "POST",
            prefer: "return=minimal",
            body: { fazione_a: fazioneA, fazione_b: fazioneB, descrizione, documenti, created_by: user.username },
        });
        await registra(user.username, fazioneA, "scambio", `Scambio registrato con ${trovaFazione(fazioneB)!.name}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function DELETE(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    const b = await leggiJson(req);
    const id = b ? intero(b.id) : null;
    if (!id) return risposta("Scambio non valido", 400);

    try {
        const rows = await db<{ fazione_a: string; fazione_b: string }[]>(
            `/scambi?id=${eq(id)}&select=fazione_a,fazione_b`
        );
        const s = rows?.[0];
        if (!s) return risposta("Scambio non trovato", 404);
        if (!(await puoModificare(user, s.fazione_a)) && !(await puoModificare(user, s.fazione_b))) {
            return risposta("Non hai i permessi per questo scambio", 403);
        }
        await db(`/scambi?id=${eq(id)}`, { method: "DELETE", prefer: "return=minimal" });
        await registra(user.username, s.fazione_a, "scambio", `Scambio eliminato (con ${s.fazione_b})`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
