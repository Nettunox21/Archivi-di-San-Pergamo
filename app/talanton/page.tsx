import Link from "next/link";
import Image from "next/image";
import { getAziende } from "@/lib/talanton";

export const metadata = {
    title: "Portale Talanton",
};

export default function TalantonPage() {
    const aziende = getAziende();

    return (
        <div className="talanton-page">
            <header className="talanton-hero">
                <h1>Portale Talanton</h1>
                <p className="wiki-subtitle">
                    Le aziende del regno e le loro pagine commerciali
                </p>
            </header>

            {aziende.length === 0 ? (
                <p className="talanton-vuoto">Nessuna azienda registrata nel portale.</p>
            ) : (
                <div className="talanton-grid">
                    {aziende.map((a) => {
                        const interno = a.link.startsWith("/");
                        const corpo = (
                            <>
                                <div className="talanton-card-top">
                                    {a.logo && (
                                        <span className="talanton-card-logo">
                                            <Image src={a.logo} alt="" fill style={{ objectFit: "cover" }} />
                                        </span>
                                    )}
                                    <div>
                                        <h2 className="talanton-card-nome">{a.nome}</h2>
                                        {a.nazione && <span className="talanton-card-nazione">{a.nazione}</span>}
                                    </div>
                                </div>
                                {a.titolare && (
                                    <p className="talanton-card-titolare">Titolare: {a.titolare}</p>
                                )}
                                {a.descrizione && <p className="talanton-card-desc">{a.descrizione}</p>}
                                <span className="talanton-card-cta">Visita la pagina →</span>
                            </>
                        );

                        if (!a.link) {
                            return (
                                <div key={a.slug} className="talanton-card talanton-card--spenta">
                                    {corpo}
                                </div>
                            );
                        }
                        return interno ? (
                            <Link key={a.slug} href={a.link} className="talanton-card">
                                {corpo}
                            </Link>
                        ) : (
                            <a
                                key={a.slug}
                                href={a.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="talanton-card"
                            >
                                {corpo}
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
