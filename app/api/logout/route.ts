import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const host = req.headers.get("host") || "localhost:3000";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;

    const res = NextResponse.redirect(new URL("/", baseUrl));
    res.cookies.set("user", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0,
    });
    return res;
}
