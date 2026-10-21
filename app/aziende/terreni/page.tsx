import Link from "next/link";
import "../aziende.css";
import "./terreni.css";
import { getTerreni } from "@/lib/aziende-dati";
import { getAzienda } from "@/lib/talanton";
import TerreniClient from "./TerreniClient";

export const metadata = {
    title: "Terreni & Immobili",
};

export default function TerreniPage() {
    const nazioni = getTerreni();
    const azienda = getAzienda("terreni-e-immobili");
    const nome = azienda?.nome ?? "Terreni & Immobili";

    return (
        <div className="az-shell imm-root">
            <header className="imm-header">
                <div className="imm-header-in">
                    <span className="imm-logo">
                        {nome.split("&")[0].trim()}
                        {nome.includes("&") && <span> &amp; {nome.split("&")[1].trim()}</span>}
                    </span>
                    <Link href="/talanton" className="imm-back">
                        ← Portale Talanton
                    </Link>
                </div>
            </header>

            <section className="imm-hero">
                <div className="imm-hero-in">
                    <h1>Trova il tuo terreno</h1>
                    <p>
                        {azienda?.descrizione || "Consulta i terreni in vendita e i loro prezzi."}
                    </p>
                </div>
            </section>

            <TerreniClient nazioni={nazioni} />

            <footer className="imm-footer">
                {azienda?.titolare ? `Titolare: ${azienda.titolare} · ` : ""}
                Sito informativo: contratti e acquisti si effettuano nel mondo.
            </footer>
        </div>
    );
}
