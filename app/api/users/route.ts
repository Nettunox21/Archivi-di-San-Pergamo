import { NextRequest, NextResponse } from "next/server";
import { db, eq } from "@/lib/db";
import { getCurrentUser, getUsers, destroyUserSessions } from "@/auth/users";
import { hashPassword } from "@/auth/password";
import { leggiJson, risposta, rispostaErrore } from "@/lib/api";

async function soloAdmin() {
    const u = await getCurrentUser();
    return u && u.role === "admin" ? u : null;
}

const USERNAME_OK = /^[A-Za-z0-9_.-]{3,32}$/;

// Modifica username e/o password di un utente
export async function POST(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);

    const b = await leggiJson(req);
    const targetUsername = b && typeof b.targetUsername === "string" ? b.targetUsername : "";
    const newUsername = b && typeof b.newUsername === "string" ? b.newUsername.trim() : "";
    const newPassword = b && typeof b.newPassword === "string" ? b.newPassword : "";
    if (!targetUsername) return risposta("Utente non specificato", 400);

    try {
        const esiste = await db<{ username: string }[]>(`/utenti?username=${eq(targetUsername)}&select=username`);
        if (!esiste?.[0]) return risposta("Utente non trovato", 404);

        const patch: Record<string, string> = {};
        if (newUsername && newUsername !== targetUsername) {
            if (!USERNAME_OK.test(newUsername)) return risposta("Username non valido (3-32 caratteri: lettere, numeri, _ . -)", 400);
            const occupato = await db<{ username: string }[]>(`/utenti?username=${eq(newUsername)}&select=username`);
            if (occupato?.[0]) return risposta("Username già in uso", 400);
            patch.username = newUsername;
        }
        if (newPassword.trim().length > 0) {
            if (newPassword.length < 6) return risposta("Password troppo corta (minimo 6 caratteri)", 400);
            patch.password_hash = await hashPassword(newPassword);
        }
        if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

        await db(`/utenti?username=${eq(targetUsername)}`, { method: "PATCH", prefer: "return=minimal", body: patch });
        // cambio password: l'utente viene disconnesso ovunque
        if (patch.password_hash) await destroyUserSessions(patch.username ?? targetUsername);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

// Crea un nuovo utente
export async function PUT(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);

    const b = await leggiJson(req);
    const username = b && typeof b.username === "string" ? b.username.trim() : "";
    const password = b && typeof b.password === "string" ? b.password : "";
    const role = b && b.role === "admin" ? "admin" : "user";
    const avatar = b && typeof b.avatar === "string" && b.avatar.trim() ? b.avatar.trim().slice(0, 200) : "/avatars/Scepter-me13.png";

    if (!USERNAME_OK.test(username)) return risposta("Username non valido (3-32 caratteri: lettere, numeri, _ . -)", 400);
    if (password.length < 6) return risposta("Password troppo corta (minimo 6 caratteri)", 400);

    try {
        await db("/utenti", {
            method: "POST",
            prefer: "return=minimal",
            body: { username, password_hash: await hashPassword(password), role, avatar },
        });
        return NextResponse.json({ ok: true });
    } catch (e) {
        return rispostaErrore(e);
    }
}

export async function GET() {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    try {
        return NextResponse.json(await getUsers());
    } catch (e) {
        return rispostaErrore(e);
    }
}
