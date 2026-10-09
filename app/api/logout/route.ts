import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/auth/users";

export async function POST(req: NextRequest) {
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token && /^[a-f0-9]{64}$/.test(token)) {
        await destroySession(token).catch(() => {});
    }

    const res = NextResponse.redirect(new URL("/", baseUrl), 303);
    res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
    res.cookies.set("user", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
}
