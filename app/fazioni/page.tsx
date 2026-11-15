import Image from "next/image";
import Link from "next/link";
import { factions, type Faction, type TipoFazione } from "@/app/data/factions";

/* Sezioni della pagina: per aggiungerne una (es. le leghe) basta una riga qui
 * e il nuovo tipo in app/data/factions.ts. */
const SEZIONI: { titolo: string; tipi: TipoFazione[] }[] = [
    { titolo: "Fazioni", tipi: ["fazione", "territorio"] },
    { titolo: "Enti governativi", tipi: ["istituto"] },
];

function Scheda({ faction }: { faction: Faction }) {
    return (
        <Link href={`/archivio/${faction.slug}`} className="faction-card">
            <div className="faction-banner">
                <Image
                    src={faction.banner}
                    alt={`Bandiera ${faction.name}`}
                    fill
                    style={{ objectFit: "cover" }}
                />
                <div className="faction-banner-overlay" />
            </div>
            <div className="faction-info">
                <h2 className="faction-name">{faction.name}</h2>
                <p className="faction-description">{faction.description}</p>
                <p className="faction-extra">{faction.info}</p>
            </div>
        </Link>
    );
}

export default function FazioniPage() {
    return (
        <>
            {SEZIONI.map((sezione) => {
                const voci = factions.filter((f) => sezione.tipi.includes(f.tipo));
                if (voci.length === 0) return null;
                return (
                    <section key={sezione.titolo}>
                        <h2 className="fazioni-titolo-sez">{sezione.titolo}</h2>
                        <div className="fazioni-grid">
                            {voci.map((faction) => (
                                <Scheda key={faction.name} faction={faction} />
                            ))}
                        </div>
                    </section>
                );
            })}
        </>
    );
}
