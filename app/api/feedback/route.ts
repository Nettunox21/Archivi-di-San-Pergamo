import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";

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
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser) {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { tag, message } = await req.json();

    const validTags = ["Errore wiki", "Pagina mancante", "Bug", "Altro"];
    if (!validTags.includes(tag)) {
        return NextResponse.json({ error: "Tag non valido" }, { status: 400 });
    }
    if (!message || message.trim().length === 0) {
        return NextResponse.json({ error: "Messaggio vuoto" }, { status: 400 });
    }
    if (message.length > 500) {
        return NextResponse.json({ error: "Messaggio troppo lungo" }, { status: 400 });
    }

    const res = await supabase("/feedback", {
        method: "POST",
        body: JSON.stringify({
            username: currentUser.username,
            tag,
            message: message.trim(),
        }),
    });

    if (!res.ok) {
        return NextResponse.json({ error: "Errore salvataggio" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const res = await supabase("/feedback?order=date.desc");
    const data = await res.json();
    return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { id } = await req.json();
    await supabase(`/feedback?id=eq.${id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
}
