import { getOpere } from "@/lib/galleria";
import "./galleria.css";

export const metadata = {
    title: "Galleria — Archivi di San Pergamo",
};

export default function GalleriaPage() {
    const opere = getOpere();

    return (
        <div className="gal-page">
            <header className="gal-hero">
                <h1>Galleria</h1>
                <p className="wiki-subtitle">Le opere d'arte del regno</p>
            </header>

            {opere.length === 0 ? (
                <p className="gal-vuota">
                    Nessuna opera: aggiungi un file .md in <code>content/galleria/</code>.
                </p>
            ) : (
                <div className="gal-grid">
                    {opere.map((o) => (
                        <figure className="gal-card" key={o.slug}>
                            {o.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={o.image} alt={o.title} className="gal-img" loading="lazy" />
                            )}
                            <figcaption className="gal-info">
                                <h2 className="gal-titolo">{o.title}</h2>
                                {o.description && (
                                    <p className="gal-desc">{o.description}</p>
                                )}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            )}
        </div>
    );
}
