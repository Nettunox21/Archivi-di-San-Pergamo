import Link from "next/link";
import { marked } from "marked";
import "../aziende.css";
import "./trauma-team.css";
import { getPianiTT, getRegolamentoTT } from "@/lib/trauma-team";
import { getAzienda } from "@/lib/talanton";
import { getCurrentUser } from "@/auth/users";
import TraumaTeamClient from "./TraumaTeamClient";

export const metadata = {
    title: "Trauma Team",
};

export default async function TraumaTeamPage() {
    const piani = getPianiTT();
    const azienda = getAzienda("trauma-team");
    const utente = await getCurrentUser();
    const regolamentoHtml = marked.parse(getRegolamentoTT()) as string;

    return (
        <div className="az-shell tt-root">
            <div className="tt-scan" aria-hidden="true" />
            <header className="tt-header">
                <div className="tt-header-in">
                    <div className="tt-brand">
                        <span className="tt-cross" aria-hidden="true">✚</span>
                        <div>
                            <div className="tt-brand-nome">TRAUMA TEAM</div>
                            <div className="tt-brand-sub">{azienda?.descrizione || "Soccorso medico d'emergenza"}</div>
                        </div>
                    </div>
                    <Link href="/talanton" className="tt-back">
                        ← Portale Talanton
                    </Link>
                </div>
            </header>

            <TraumaTeamClient piani={piani} regolamentoHtml={regolamentoHtml} utente={utente ? utente.username : null} />

            <footer className="tt-footer">
                {azienda?.titolare ? `Titolare: ${azienda.titolare} · ` : ""}
                Sito informativo: pagamenti e prestazioni si gestiscono nel mondo di gioco.
            </footer>
        </div>
    );
}
