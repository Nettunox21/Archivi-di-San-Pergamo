import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione, puoModificare, registra } from "@/lib/economia";
import { leggiJson, risposta, rispostaErrore, intero, testo } from "@/lib/api";
import { parseNumero } from "@/lib/numeri";

const MAX_TEMPO = 60 * 60 * 24 * 365; // un anno in secondi
const MAX_COSTI = 20;

type Corpo = {
    fazione: string;
    nome: string;
    descrizione: string;
    prodottoId: number;
    prodottoQuantita: bigint;
    tempoSecondi: number;
    costi: { risorsaId: number; quantita: bigint }[];
};

function leggiCorpo(b: Record<string, unknown>): Corpo | string {
    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    if (!trovaFazione(fazione)) return "Fazione non valida";

    const nome = testo(b.nome, 80);
    if (!nome) return "Nome mancante (max 80 caratteri)";

    const descrizione = typeof b.descrizione === "string" ? b.descrizione.trim().slice(0, 300) : "";

    const prodottoId = intero(b.prodottoId);
    if (!prodottoId) return "Scegli la risorsa prodotta";

    const prodottoQuantita = parseNumero(b.prodottoQuantita);
    if (prodottoQuantita === null || prodottoQuantita === 0n) return "Quantità prodotta non valida";

    const tempoSecondi = intero(b.tempoSecondi);
    if (!tempoSecondi || tempoSecondi > MAX_TEMPO) return "Tempo di produzione non valido";

    const grezzi = Array.isArray(b.costi) ? b.costi : [];
    if (grezzi.length > MAX_COSTI) return "Troppi costi";
    const costi: Corpo["costi"] = [];
    const visti = new Set<number>();
    for (const c of grezzi) {
        const rid = intero((c as Record<string, unknown>)?.risorsaId);
        const q = parseNumero((c as Record<string, unknown>)?.quantita);
        if (!rid || q === null) return "Costo non valido";
        if (visti.has(rid)) return "Una risorsa è ripetuta nei costi";
        visti.add(rid);
        if (q > 0n) costi.push({ risorsaId: rid, quantita: q });
    }

    return { fazione, nome, descrizione, prodottoId, prodottoQuantita, tempoSecondi, costi };
}

async function scriviCosti(farmId: number, costi: Corpo["costi"]) {
    await db(`/farm_costi?farm_id=${eq(farmId)}`, { method: "DELETE", prefer: "return=minimal" });
    if (costi.length === 0) return;
    await db("/farm_costi", {
        method: "POST",
        prefer: "return=minimal",
        body: costi.map((c) => ({ farm_id: farmId, risorsa_id: c.risorsaId, quantita: c.quantita.toString() })),
    });
}

export async function POST(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const c = leggiCorpo(b);
    if (typeof c === "string") return risposta(c, 400);
    if (!(await puoModificare(user, c.fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        const creata = await db<{ id: number }[]>("/farm", {
            method: "POST",
            body: {
                fazione: c.fazione,
                nome: c.nome,
                descrizione: c.descrizione,
                prodotto_id: c.prodottoId,
                prodotto_quantita: c.prodottoQuantita.toString(),
                tempo_secondi: c.tempoSecondi,
                created_by: user.username,
            },
        });
        await scriviCosti(creata[0].id, c.costi);
        await registra(user.username, c.fazione, "farm", `Farm creata: ${c.nome}`);
        return NextResponse.json({ ok: true, id: creata[0].id });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function PUT(req: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const id = intero(b.id);
    const c = leggiCorpo(b);
    if (!id) return risposta("Farm non valida", 400);
    if (typeof c === "string") return risposta(c, 400);
    if (!(await puoModificare(user, c.fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        // la farm deve appartenere davvero a questa fazione
        const esiste = await db<{ id: number }[]>(`/farm?id=${eq(id)}&fazione=${eq(c.fazione)}&select=id`);
        if (!esiste?.[0]) return risposta("Farm non trovata in questa fazione", 404);

        await db(`/farm?id=${eq(id)}`, {
            method: "PATCH",
            prefer: "return=minimal",
            body: {
                nome: c.nome,
                descrizione: c.descrizione,
                prodotto_id: c.prodottoId,
                prodotto_quantita: c.prodottoQuantita.toString(),
                tempo_secondi: c.tempoSecondi,
            },
        });
        await scriviCosti(id, c.costi);
        await registra(user.username, c.fazione, "farm", `Farm modificata: ${c.nome}`);
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

    const id = intero(b.id);
    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    if (!id || !trovaFazione(fazione)) return risposta("Dati non validi", 400);
    if (!(await puoModificare(user, fazione))) return risposta("Non hai i permessi per questa fazione", 403);

    try {
        const f = await db<{ nome: string }[]>(`/farm?id=${eq(id)}&fazione=${eq(fazione)}&select=nome`);
        if (!f?.[0]) return risposta("Farm non trovata in questa fazione", 404);
        await db(`/farm?id=${eq(id)}`, { method: "DELETE", prefer: "return=minimal" });
        await registra(user.username, fazione, "farm", `Farm eliminata: ${f[0].nome}`);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
