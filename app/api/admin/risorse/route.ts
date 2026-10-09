import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { leggiJson, risposta, rispostaErrore, intero, testo } from "@/lib/api";
import { parseNumero } from "@/lib/numeri";

async function soloAdmin() {
    const u = await getCurrentUser();
    return u && u.role === "admin" ? u : null;
}

export async function GET() {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    try {
        const rows = await db<{ id: number; nome: string; valore: string }[]>(
            "/risorse?select=id,nome,valore&order=nome.asc"
        );
        return NextResponse.json(rows);
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function POST(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    const b = await leggiJson(req);
    const nome = b ? testo(b.nome, 80) : null;
    const valore = b ? parseNumero(b.valore) : null;
    if (!nome) return risposta("Nome mancante (max 80 caratteri)", 400);
    if (valore === null) return risposta("Valore non valido (intero, in euro)", 400);

    try {
        await db("/risorse", { method: "POST", prefer: "return=minimal", body: { nome, valore: valore.toString() } });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function PATCH(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    const b = await leggiJson(req);
    const id = b ? intero(b.id) : null;
    if (!b || !id) return risposta("Risorsa non valida", 400);

    const patch: Record<string, string> = {};
    if (b.nome !== undefined) {
        const nome = testo(b.nome, 80);
        if (!nome) return risposta("Nome non valido", 400);
        patch.nome = nome;
    }
    if (b.valore !== undefined) {
        const valore = parseNumero(b.valore);
        if (valore === null) return risposta("Valore non valido (intero, in euro)", 400);
        patch.valore = valore.toString();
    }
    if (Object.keys(patch).length === 0) return risposta("Niente da modificare", 400);

    try {
        await db(`/risorse?id=${eq(id)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function DELETE(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    const b = await leggiJson(req);
    const id = b ? intero(b.id) : null;
    if (!id) return risposta("Risorsa non valida", 400);

    try {
        await db(`/risorse?id=${eq(id)}`, { method: "DELETE", prefer: "return=minimal" });
        return NextResponse.json({ ok: true });
    } catch (e) {
        // la risorsa è usata da fazioni o farm: il database la protegge
        if (e instanceof Error && "code" in e && (e as { code: string }).code === "23503") {
            return risposta("Risorsa in uso da fazioni o farm: rimuovila prima da lì", 409);
        }
        return rispostaErrore(e);
    }
}
