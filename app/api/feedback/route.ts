import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import fs from "fs";
import path from "path";

// On Vercel, the project root is read-only. We use /tmp for writable storage.
// Data is initialized from the bundled seed file on first cold start.
const FEEDBACK_SEED = path.join(process.cwd(), "data", "feedback.json");
const FEEDBACK_TMP = path.join("/tmp", "feedback.json");

function loadFeedback(): object[] {
    // Prefer /tmp (mutable), fall back to bundled seed
    const file = fs.existsSync(FEEDBACK_TMP) ? FEEDBACK_TMP : FEEDBACK_SEED;
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, "utf-8");
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function saveFeedback(data: object[]) {
    fs.writeFileSync(FEEDBACK_TMP, JSON.stringify(data, null, 2));
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

    const feedbacks = loadFeedback();
    feedbacks.push({
        id: Date.now(),
        username: currentUser.username,
        tag,
        message: message.trim(),
        date: new Date().toISOString(),
    });
    saveFeedback(feedbacks);

    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const feedbacks = loadFeedback();
    return NextResponse.json(feedbacks);
}
