"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Azienda } from "@/lib/talanton";

// Pagine dove il banner non deve comparire
const ESCLUSE = ["/talanton", "/login", "/admin"];

function Contenuto({ a }: { a: Azienda }) {
    return (
        <>
            {a.logo && (
                <span className="talanton-banner-logo">
                    <Image src={a.logo} alt="" fill style={{ objectFit: "cover" }} />
                </span>
            )}
            <span className="talanton-banner-testo">
                <span className="talanton-banner-label">Pubblicità · Portale Talanton</span>
                <strong className="talanton-banner-nome">{a.nome}</strong>
                {a.descrizione && <span className="talanton-banner-desc">{a.descrizione}</span>}
            </span>
            <span className="talanton-banner-cta">Scopri →</span>
        </>
    );
}

export default function TalantonBanner({ aziende }: { aziende: Azienda[] }) {
    const pathname = usePathname();
    const [scelta, setScelta] = useState<Azienda | null>(null);

    // Sceglie un'azienda a caso a ogni cambio pagina (lato client, così ruota davvero),
    // evitando se possibile di ripetere quella appena mostrata.
    useEffect(() => {
        if (aziende.length === 0) {
            setScelta(null);
            return;
        }
        setScelta((prec) => {
            const candidate = aziende.length > 1 ? aziende.filter((a) => a.slug !== prec?.slug) : aziende;
            return candidate[Math.floor(Math.random() * candidate.length)];
        });
    }, [pathname, aziende]);

    if (!scelta) return null;
    if (ESCLUSE.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

    const interno = scelta.link.startsWith("/");

    return (
        <div className="talanton-banner-wrap">
            {interno ? (
                <Link href={scelta.link} className="talanton-banner">
                    <Contenuto a={scelta} />
                </Link>
            ) : (
                <a href={scelta.link} target="_blank" rel="noopener noreferrer" className="talanton-banner">
                    <Contenuto a={scelta} />
                </a>
            )}
        </div>
    );
}
