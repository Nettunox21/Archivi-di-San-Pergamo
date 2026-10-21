"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { AziendaPubblicita, Formato } from "@/lib/talanton";

// Pagine dove la pubblicità non deve comparire
const ESCLUSE = ["/talanton", "/aziende", "/login", "/admin"];

type Scelta = { azienda: AziendaPubblicita; formato: Formato };

function Link2({
    href,
    className,
    children,
}: {
    href: string;
    className: string;
    children: React.ReactNode;
}) {
    return href.startsWith("/") ? (
        <Link href={href} className={className}>
            {children}
        </Link>
    ) : (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
            {children}
        </a>
    );
}

function VideoAd({ file, poster }: { file: string; poster: string }) {
    const ref = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        const v = ref.current;
        if (!v) return;
        v.muted = true;
        v.play().catch(() => {});
    }, [file]);
    return (
        <video
            ref={ref}
            src={file}
            poster={poster || undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
        />
    );
}

function Didascalia({ testo, cta }: { testo: string; cta: string }) {
    if (!testo && !cta) return null;
    return (
        <span className="talanton-ad-didascalia">
            <span className="talanton-ad-testo">{testo}</span>
            {cta && <span className="talanton-banner-cta">{cta} →</span>}
        </span>
    );
}

export default function TalantonBanner({ aziende }: { aziende: AziendaPubblicita[] }) {
    const pathname = usePathname();
    const [scelta, setScelta] = useState<Scelta | null>(null);

    // A ogni cambio pagina sceglie un'azienda a caso (evitando di ripetere l'ultima)
    // e poi uno dei suoi formati a caso.
    useEffect(() => {
        if (aziende.length === 0) {
            setScelta(null);
            return;
        }
        setScelta((prec) => {
            const candidate =
                aziende.length > 1 ? aziende.filter((a) => a.slug !== prec?.azienda.slug) : aziende;
            const azienda = candidate[Math.floor(Math.random() * candidate.length)];
            const formato = azienda.formati[Math.floor(Math.random() * azienda.formati.length)];
            return { azienda, formato };
        });
    }, [pathname, aziende]);

    if (!scelta) return null;
    if (ESCLUSE.some((p) => pathname === p || pathname.startsWith(p + "/"))) return null;

    const { azienda: a, formato: f } = scelta;

    return (
        <div className="talanton-banner-wrap">
            {f.tipo === "banner" && (
                <Link2 href={a.link} className="talanton-banner">
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
                </Link2>
            )}

            {f.tipo === "immagine" && (
                <Link2 href={a.link} className="talanton-ad">
                    <span className="talanton-banner-label talanton-ad-label">
                        Pubblicità · {a.nome}
                    </span>
                    <span className="talanton-ad-media">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.file} alt={f.alt} />
                    </span>
                    <Didascalia testo={f.testo} cta={f.cta} />
                </Link2>
            )}

            {f.tipo === "video" && (
                <Link2 href={a.link} className="talanton-ad">
                    <span className="talanton-banner-label talanton-ad-label">
                        Pubblicità · {a.nome}
                    </span>
                    <span className="talanton-ad-media">
                        <VideoAd file={f.file} poster={f.poster} />
                    </span>
                    <Didascalia testo={f.testo} cta={f.cta} />
                </Link2>
            )}
        </div>
    );
}
