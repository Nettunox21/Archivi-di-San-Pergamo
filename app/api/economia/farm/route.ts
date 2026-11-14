import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione, puoModificare } from "@/lib/economia";
import { leggiJson, risposta, rispostaErrore, intero, testo } from "@/lib/api";
import { parseNumero } from "@/lib/numeri";

const MAX_TEMPO = 60 * 60 * 24 * 365; // un anno in secondi
const MAX_VOCI = 20;

type Voce = { risorsaId: number; quantita: bigint };

type Corpo = {
    fazione: string;
    nome: string;
    descrizione: string;
    passiva: boolean;
    tempoSecondi: number;
    prodotti: Voce[]; // almeno una
    costi: Voce[]; // anche nessuna
};

/** Legge una lista di (risorsa, quantità). Le voci con quantità 0 vengono ignorate. */
function leggiVoci(grezzi: unknown, etichetta: string): Voce[] | string {
    const lista = Array.isArray(grezzi) ? grezzi : [];
    if (lista.length > MAX_VOCI) return `Troppe voci in "${etichetta}"`;
    const voci: Voce[] = [];
    const viste = new Set<number>();
    for (const c of lista) {
        const rid = intero((c as Record<string, unknown>)?.risorsaId);
        const q = parseNumero((c as Record<string, unknown>)?.quantita);
        if (!rid || q === null) return `Voce non valida in "${etichetta}"`;
        if (viste.has(rid)) return `Una risorsa è ripetuta in "${etichetta}"`;
        viste.add(rid);
        if (q > 0n) voci.push({ risorsaId: rid, quantita: q });
    }
    return voci;
}

function leggiCorpo(b: Record<string, unknown>): Corpo | string {
    const fazione = typeof b.fazione === "string" ? b.fazione : "";
    if (!trovaFazione(fazione)) return "Fazione non valida";

    const nome = testo(b.nome, 80);
    if (!nome) return "Nome mancante (max 80 caratteri)";

    const descrizione = typeof b.descrizione === "string" ? b.descrizione.trim().slice(0, 300) : "";
    const passiva = b.passiva === true;

    const tempoSecondi = intero(b.tempoSecondi);
    if (!tempoSecondi || tempoSecondi > MAX_TEMPO) return "Tempo non valido";

    const prodotti = leggiVoci(b.prodotti, "produzione");
    if (typeof prodotti === "string") return prodotti;
    if (prodotti.length === 0) return "La farm deve produrre almeno una risorsa";

    const costi = leggiVoci(b.costi, "costi");
    if (typeof costi === "string") return costi;

    return { fazione, nome, descrizione, passiva, tempoSecondi, prodotti, costi };
}

async function scriviVoci(tabella: "farm_prodotti" | "farm_costi", farmId: number, voci: Voce[]) {
    await db(`/${tabella}?farm_id=${eq(farmId)}`, { method: "DELETE", prefer: "return=minimal" });
    if (voci.length === 0) return;
    await db(`/${tabella}`, {
        method: "POST",
        prefer: "return=minimal",
        body: voci.map((c) => ({ farm_id: farmId, risorsa_id: c.risorsaId, quantita: c.quantita.toString() })),
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
                passiva: c.passiva,
                tempo_secondi: c.tempoSecondi,
                created_by: user.username,
            },
        });
        await scriviVoci("farm_prodotti", creata[0].id, c.prodotti);
        await scriviVoci("farm_costi", creata[0].id, c.costi);
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
                passiva: c.passiva,
                tempo_secondi: c.tempoSecondi,
            },
        });
        await scriviVoci("farm_prodotti", id, c.prodotti);
        await scriviVoci("farm_costi", id, c.costi);
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
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}
