// Salva questo file come: app/notizie/page.tsx

import { getNewsArticles } from "@/lib/notizie";
import NotizieClient from "@/app/components/NotizieClient";

export default function NotiziePage() {
    const articles = getNewsArticles();

    // Separazione in base al tag "secret" nel frontmatter di ogni articolo
    const normali = articles.filter((a) => !a.secret);
    const segreti = articles.filter((a) => a.secret);

    return (
        <>
            {/* Filtro SVG per la distorsione "glitch" delle immagini in stile
                cyberpunk. E' solo una definizione, non renderizza nulla da solo:
                viene richiamato dal CSS con filter: url(#cp-distort) */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
                <defs>
                    <filter id="cp-distort" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.012 0.14"
                            numOctaves="2"
                            seed="4"
                            result="cpNoise"
                        />
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="cpNoise"
                            scale="22"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            <NotizieClient normali={normali} segreti={segreti} />
        </>
    );
}
