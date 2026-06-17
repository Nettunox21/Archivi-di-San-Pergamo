import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";
import fs from "fs";
import path from "path";

// On Vercel, the project root is read-only. We use /tmp for writable storage.
// Users are initialized from the bundled data/users.json on first cold start.
const USERS_TMP = path.join("/tmp", "users.json");

function saveUsers(data: object[]) {
    fs.writeFileSync(USERS_TMP, JSON.stringify(data, null, 2));
}

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    const { targetUsername, newUsername, newPassword } = await req.json();

    if (!targetUsername) {
        return NextResponse.json({ error: "Utente non specificato" }, { status: 400 });
    }

    const users = getUsers();
    const index = users.findIndex((u) => u.username === targetUsername);

    if (index === -1) {
        return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }

    if (newUsername && newUsername !== targetUsername) {
        const exists = users.find((u) => u.username === newUsername);
        if (exists) {
            return NextResponse.json({ error: "Username già in uso" }, { status: 400 });
        }
        users[index].username = newUsername;
    }

    if (newPassword && newPassword.trim().length > 0) {
        users[index].password = newPassword;
    }

    saveUsers(users);
    return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    if (!currentUser || currentUser.role !== "admin") {
        return NextResponse.json({ error: "Non autorizzato" }, { status: 403 });
    }

    return NextResponse.json(getUsers());
}
