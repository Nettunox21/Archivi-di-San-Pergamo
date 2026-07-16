import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import SearchBar from "./components/SearchBar";
import { cookies } from "next/headers";
import { getUsers } from "@/auth/users";

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user")?.value || null;
    const currentUser = getUsers().find((u) => u.username === userCookie) || null;

    return (
        <html lang="it">
            <body>
                <header className="topbar">
                    <Link
                        href={currentUser?.role === "admin" ? "/admin" : "/"}
                        className="logo"
                    >
                        <Image
                            src="/logo.png"
                            alt="San Pergamo"
                            width={28}
                            height={28}
                        />
                        <span>Archivi di San Pergamo</span>
                    </Link>
                    <nav className="nav">
                        <Link href="/">Home</Link>
                        <Link href="/mappa">Mappa</Link>
                        <Link href="/fazioni">Fazioni</Link>
                        <Link href="/feedback">Feedback</Link>
                        <Link href="/notizie">Notizie</Link>
                    </nav>
                    <div className="search">
                        <SearchBar />
                    </div>
                    <div className="profile">
                        {currentUser ? (
                            <div className="profile-logged">
                                <span>{currentUser.username}</span>
                                <Image
                                    src={currentUser.avatar}
                                    alt="avatar"
                                    width={28}
                                    height={28}
                                    className="profile-avatar"
                                />
                                <form action="/api/logout" method="POST">
                                    <button type="submit" className="logout-btn">
                                        Esci
                                    </button>
                                </form>
                            </div>
                        ) : (
                            <Link href="/login" className="login-link">
                                👤 Accedi
                            </Link>
                        )}
                    </div>
                </header>
                <main className="container">{children}</main>
            </body>
        </html>
    );
}
