import { NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/auth/users";

export async function POST(req: NextRequest) {
    const { username, password } = await req.json();
    const user = getUsers().find(
        (u) => u.username === username && u.password === password
    );

    if (!user) {
        return NextResponse.json(
            { error: "Username o password errati" },
            { status: 401 }
        );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("user", user.username, {
        httpOnly: true,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
    });
    return res;
}