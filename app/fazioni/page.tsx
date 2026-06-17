import Image from "next/image";
import Link from "next/link";
import { factions } from "@/app/data/factions";

export default function FazioniPage() {
    return (
        <div className="fazioni-grid">
            {factions.map((faction) => (
                <Link
                    key={faction.name}
                    href={`/archivio/${faction.slug}`}
                    className="faction-card"
                >
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
            ))}
        </div>
    );
}