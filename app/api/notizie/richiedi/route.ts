// Salva questo file come: app/api/notizie/richiedi/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

async function supabase(path: string, options: RequestInit = {}) {
    return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        ...options,
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
            ...(options.headers || {}),
        },
    });
}

export async function POST(req: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { argomento, dettagli } = await req.json();

    if (!argomento || argomento.trim().length === 0) {
        return NextResponse.json({ error: "Argomento mancante" }, { status: 400 });
    }
    if (!dettagli || dettagli.trim().length === 0) {
        return NextResponse.json({ error: "Dettagli mancanti" }, { status: 400 });
    }
    if (argomento.length > 150) {
        return NextResponse.json({ error: "Argomento troppo lungo" }, { status: 400 });
    }
    if (dettagli.length > 1000) {
        return NextResponse.json({ error: "Dettagli troppo lunghi" }, { status: 400 });
    }

    const res = await supabase("/news_requests", {
        method: "POST",
        body: JSON.stringify({
            username: currentUser.username,
            argomento: argomento.trim(),
            dettagli: dettagli.trim(),
        }),
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const res = await supabase("/news_requests?order=created_at.desc");
    const data = await res.json();
    return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { id } = await req.json();
    await supabase(`/news_requests?id=eq.${id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
}
