import "./globals.css";
import "./economia.css";
import "./notifiche.css";
import "./talanton.css";
import Link from "next/link";
import Image from "next/image";
import SearchBar from "./components/SearchBar";
import MobileMenu from "./components/MobileMenu";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import NotificheBell from "./components/NotificheBell";
import TalantonBanner from "./components/TalantonBanner";
import NascondiSuAziende from "./components/NascondiSuAziende";
import { getAziendePubblicita } from "@/lib/talanton";
import { getCurrentUser } from "@/auth/users";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "San Pergamo",
    },
    icons: {
        icon: "/icons/icon-192.png",
        apple: "/icons/apple-touch-icon.png",
    },
};

export const viewport: Viewport = {
    themeColor: "#151311",
    width: "device-width",
    initialScale: 1,
};

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const currentUser = await getCurrentUser();
    const aziendePubblicita = getAziendePubblicita();

    return (
        <html lang="it">
            <body>
                <ServiceWorkerRegister />
                <NascondiSuAziende>
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
                        <Link href="/economia">Economia</Link>
                        <Link href="/talanton">Portale Talanton</Link>
                        <Link href="/documenti">Documenti</Link>
                        <Link href="/feedback">Feedback</Link>
                        <Link href="/notizie">Notizie</Link>
                        <Link href="/cronologia">Linea del tempo</Link>
                    </nav>
                    <div className="search">
                        <SearchBar />
                    </div>
                    <div className="profile">
                        {currentUser ? (
                            <div className="profile-logged">
                                <NotificheBell />
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

                    {currentUser && <NotificheBell className="notif-bell--mobile" />}

                    <MobileMenu
                        currentUser={
                            currentUser
                                ? { username: currentUser.username, avatar: currentUser.avatar }
                                : null
                        }
                    />
                </header>
                <TalantonBanner aziende={aziendePubblicita} />
                </NascondiSuAziende>
                <main className="container">{children}</main>
            </body>
        </html>
    );
}
