"use client";

import { usePathname } from "next/navigation";

/**
 * Nasconde menu, barra in alto e banner sulle pagine delle aziende (/aziende/...),
 * che hanno un aspetto completamente loro.
 */
export default function NascondiSuAziende({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    if (pathname === "/aziende" || pathname.startsWith("/aziende/")) return null;
    return <>{children}</>;
}
