import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { generaChiaviVapid } from "@/lib/webpush";
import { risposta } from "@/lib/api";

// Genera una nuova coppia di chiavi da copiare su Vercel. Non viene salvato nulla.
export async function POST() {
    const u = await getCurrentUser();
    if (!u || u.role !== "admin") return risposta("Non autorizzato", 403);
    return NextResponse.json(generaChiaviVapid(), { headers: { "Cache-Control": "no-store" } });
}
