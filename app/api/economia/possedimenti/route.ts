import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione, puoModificare } from "@/lib/economia";
import { leggiJson, risposta, rispostaErrore, intero } from "@/lib/api";
import { MAX_CIFRE, daTesto, parseNumero } from "@/lib/numeri";

const MODI = ["imposta", "aggiungi", "sottrai"] as const;
type Modo = (typeof MODI)[number];

// Modifica la quantità di una risorsa posseduta da una fazione.
// modo: "imposta" (sostituisce), "aggiungi" (somma), "sottrai". Senza modo vale "imposta".
export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);

    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    const risorsaId = intero(b.risorsaId);
    const quantita = parseNumero(b.quantita);
    if (b.modo !== undefined && !(MODI as readonly unknown[]).includes(b.modo)) return risposta("Modalità non valida", 400);
    const modo = (b.modo ?? "imposta") as Modo;
    if (!trovaFazione(fazione) || !risorsaId) return risposta("Dati non validi", 400);
    if (quantita === null) return risposta(`Quantità non valida (solo numeri interi, max ${MAX_CIFRE} cifre)`, 400);
    if (!(await puoModificare(user, fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        const ris = await db<{ nome: string }[]>(`/risorse?id=${eq(risorsaId)}&select=nome`);
        if (!ris?.[0]) return risposta("Risorsa non trovata", 404);

        if (modo === "imposta") {
            await db("/possedimenti?on_conflict=fazione,risorsa_id", {
                method: "POST",
                prefer: "resolution=merge-duplicates,return=minimal",
                body: { fazione, risorsa_id: risorsaId, quantita: quantita.toString() },
            });
            return NextResponse.json({ ok: true, quantita: quantita.toString() });
        }

        // aggiungi / sottrai: il calcolo è fatto qui, nel codice
        const righe = await db<{ quantita: string }[]>(
            `/possedimenti?fazione=${eq(fazione)}&risorsa_id=${eq(risorsaId)}&select=quantita`
        );
        const riga = righe?.[0];
        const attuale = riga ? daTesto(riga.quantita) : 0n;
        const nuovo = modo === "aggiungi" ? attuale + quantita : attuale - quantita;

        if (nuovo < 0n) return risposta("Non puoi sottrarre più di quello che la fazione possiede", 400);
        if (nuovo.toString().length > MAX_CIFRE) return risposta(`Il risultato supera il limite di ${MAX_CIFRE} cifre`, 400);

        if (riga) {
            // aggiorna solo se nel frattempo nessun altro ha cambiato la quantità
            const agg = await db<unknown[]>(
                `/possedimenti?fazione=${eq(fazione)}&risorsa_id=${eq(risorsaId)}&quantita=${eq(riga.quantita)}`,
                { method: "PATCH", body: { quantita: nuovo.toString() } }
            );
            if (!agg || agg.length === 0) return risposta("La quantità è cambiata nel frattempo: controlla e riprova", 409);
        } else {
            await db("/possedimenti", {
                method: "POST",
                prefer: "return=minimal",
                body: { fazione, risorsa_id: risorsaId, quantita: nuovo.toString() },
            });
        }
        return NextResponse.json({ ok: true, quantita: nuovo.toString() });
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
        await db(`/possedimenti?fazione=${eq(fazione)}&risorsa_id=${eq(risorsaId)}`, {
            method: "DELETE",
            prefer: "return=minimal",
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
