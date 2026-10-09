import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY!;

const MAP_SEED = path.join(process.cwd(), "data", "map.json");

async function loadMap() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/map?id=eq.1`, {
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
    // Fallback al seed locale
    const raw = fs.readFileSync(MAP_SEED, "utf-8");
    return JSON.parse(raw);
}

async function saveMap(data: object) {
    await fetch(`${SUPABASE_URL}/rest/v1/map?id=eq.1`, {
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
    const map = await loadMap();
    return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
    const currentUser = await getCurrentUser();

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    await saveMap(body);
    return NextResponse.json({ ok: true });
}
