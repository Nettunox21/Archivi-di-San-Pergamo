"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SearchBar from "./SearchBar";

type MobileMenuProps = {
    currentUser: { username: string; avatar: string } | null;
};

export default function MobileMenu({ currentUser }: MobileMenuProps) {
    const [open, setOpen] = useState(false);

    // blocca lo scroll del body quando il menu è aperto
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    return (
        <>
            <button
                className="hamburger-btn"
                aria-label="Apri menu"
                aria-expanded={open}
                onClick={() => setOpen(true)}
            >
                <span />
                <span />
                <span />
            </button>

            <div
                className={`mobile-menu-overlay ${open ? "is-open" : ""}`}
                onClick={() => setOpen(false)}
                aria-hidden={!open}
            >
                <nav
                    className="mobile-menu"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button
                        className="mobile-menu-close"
                        onClick={() => setOpen(false)}
                        aria-label="Chiudi menu"
                    >
                        ✕
                    </button>

                    <div className="mobile-menu-search">
                        <SearchBar />
                    </div>

                    <div className="mobile-menu-links">
                        <Link href="/" onClick={() => setOpen(false)}>Home</Link>
                        <Link href="/mappa" onClick={() => setOpen(false)}>Mappa</Link>
                        <Link href="/fazioni" onClick={() => setOpen(false)}>Fazioni</Link>
                        <Link href="/feedback" onClick={() => setOpen(false)}>Feedback</Link>
                        <Link href="/notizie" onClick={() => setOpen(false)}>Notizie</Link>
                    </div>

                    <div className="mobile-menu-divider" />

                    {currentUser ? (
                        <div className="mobile-menu-profile">
                            <Image
                                src={currentUser.avatar}
                                alt="avatar"
                                width={32}
                                height={32}
                                className="profile-avatar"
                            />
                            <span>{currentUser.username}</span>
                            <form action="/api/logout" method="POST">
                                <button type="submit" className="logout-btn">
                                    Esci
                                </button>
                            </form>
                        </div>
                    ) : (
                        <Link
                            href="/login"
                            className="login-link"
                            onClick={() => setOpen(false)}
                        >
                            👤 Accedi
                        </Link>
                    )}
                </nav>
            </div>
        </>
    );
}
