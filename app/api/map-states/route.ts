import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

const STATES_SEED = path.join(process.cwd(), "data", "mapStates.json");

async function loadStates() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/map_states?id=eq.1`, {
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
        },
        cache: "no-store",
    });
    const rows = await res.json();
    if (rows && rows.length > 0) {
        return rows[0].data;
    }
    const raw = fs.readFileSync(STATES_SEED, "utf-8");
    return JSON.parse(raw);
}

async function saveStates(data: object) {
    await fetch(`${SUPABASE_URL}/rest/v1/map_states?id=eq.1`, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        body: JSON.stringify({ data }),
    });
}

export async function GET() {
    const states = await loadStates();
    return NextResponse.json(states);
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    await saveStates(body);
    return NextResponse.json({ ok: true });
}
