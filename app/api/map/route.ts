import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import fs from "fs";
import path from "path";

// On Vercel, the project root is read-only. We use /tmp for writable storage.
// On first load, /tmp/map.json is initialized from the bundled data/map.json.
const MAP_SEED = path.join(process.cwd(), "data", "map.json");
const MAP_TMP = path.join("/tmp", "map.json");

function loadMap() {
    // Prefer /tmp (mutable), fall back to bundled seed
    const file = fs.existsSync(MAP_TMP) ? MAP_TMP : MAP_SEED;
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
}

function saveMap(data: object) {
    fs.writeFileSync(MAP_TMP, JSON.stringify(data, null, 2));
}

export async function GET() {
    return NextResponse.json(loadMap());
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const body = await req.json();
    saveMap(body);
    return NextResponse.json({ ok: true });
}
