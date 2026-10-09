import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { verificaPassword } from "@/auth/password";
import { createSession, SESSION_COOKIE, SESSION_DAYS } from "@/auth/users";

// Hash finto: serve a fare lo stesso lavoro anche quando lo username non esiste
const HASH_FINTO = "scrypt1$00000000000000000000000000000000$" + "00".repeat(64);

export async function POST(req: NextRequest) {
    let username = "";
    let password = "";
    try {
        const b = await req.json();
        username = typeof b.username === "string" ? b.username : "";
        password = typeof b.password === "string" ? b.password : "";
    } catch {
        return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
    }

    try {
        const rows = await db<{ username: string; password_hash: string }[]>(
            `/utenti?username=${eq(username)}&select=username,password_hash`
        );
        const user = rows?.[0];
        const ok = await verificaPassword(password, user?.password_hash ?? HASH_FINTO);

        if (!user || !ok) {
            return NextResponse.json({ error: "Username o password errati" }, { status: 401 });
        }

        const token = await createSession(user.username);
        const res = NextResponse.json({ ok: true });
        res.cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * SESSION_DAYS,
        });
        // vecchio cookie non più usato
        res.cookies.set("user", "", { httpOnly: true, path: "/", maxAge: 0 });
        return res;
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: "Errore del server, riprova" }, { status: 500 });
    }
}
