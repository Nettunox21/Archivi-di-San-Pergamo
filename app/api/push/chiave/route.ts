import { NextResponse } from "next/server";

// Chiave pubblica che il telefono usa per iscriversi (pubblica per natura).
export async function GET() {
    return NextResponse.json({ chiave: process.env.VAPID_PUBLIC_KEY || null });
}
