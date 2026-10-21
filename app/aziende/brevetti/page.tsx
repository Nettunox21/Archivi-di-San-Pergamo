import Link from "next/link";
import "../aziende.css";
import "./brevetti.css";
import { getBrevetti } from "@/lib/aziende-dati";
import { getAzienda } from "@/lib/talanton";
import BrevettiClient from "./BrevettiClient";

export const metadata = {
    title: "Registro Brevetti",
};

export default function BrevettiPage() {
    // Passo al client solo i campi che servono alla lista (non il testo completo)
    const brevetti = getBrevetti().map((b) => ({
        slug: b.slug,
        codice: b.codice,
        titolo: b.titolo,
        inventore: b.inventore,
        fazione: b.fazione,
        data: b.data,
        categoria: b.categoria,
        stato: b.stato,
        estratto: b.estratto,
    }));
    const azienda = getAzienda("ufficio-brevetti");
    const nome = azienda?.nome ?? "Registro Brevetti";

    return (
        <div className="az-shell sci-root">
            <header className="sci-header">
                <div className="sci-header-in">
                    <div>
                        <div className="sci-marchio">{azienda?.titolare || "SENPAI"}</div>
                        <div className="sci-titolo-sito">{nome}</div>
                    </div>
                    <Link href="/talanton" className="sci-back">
                        ← Portale Talanton
                    </Link>
                </div>
            </header>

            <main className="sci-main">
                <p className="sci-intro">
                    {azienda?.descrizione || "Archivio delle invenzioni registrate."}
                </p>
                <BrevettiClient brevetti={brevetti} />
            </main>

            <footer className="sci-footer">
                {azienda?.titolare ? `${azienda.titolare} · ` : ""}Registro consultabile a scopo informativo
            </footer>
        </div>
    );
}
