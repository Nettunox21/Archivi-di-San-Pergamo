import { NextResponse } from "next/server";
import { configVapid } from "@/lib/webpush";

// Chiave pubblica che il telefono usa per iscriversi (pubblica per natura).
// Se la configurazione su Vercel non è valida non la restituisce: meglio dirlo chiaro che far fallire l'iscrizione.
export async function GET() {
    const cfg = configVapid();
    return NextResponse.json({ chiave: cfg ? cfg.pubblica : null });
}
