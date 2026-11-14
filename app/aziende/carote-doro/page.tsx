import fs from "fs";
import path from "path";
import Link from "next/link";
import { marked } from "marked";
import "../aziende.css";
import "./carote-doro.css";
import { getConfigCarote, getDoveCarote, getRegolamentoCarote } from "@/lib/carote-doro";
import { getAzienda } from "@/lib/talanton";
import { getCurrentUser } from "@/auth/users";
import CaroteDoroClient from "./CaroteDoroClient";

// Logo dell'azienda (opzionale): PNG da caricare in public/images/carote-doro-logo.png
const LOGO = "/images/carote-doro-logo.png";

export const metadata = {
    title: "Carote d'Oro",
};

const html = (md: string) => marked.parse(md) as string;

export default async function CaroteDoroPage() {
    const cfg = getConfigCarote();
    const azienda = getAzienda("carote-doro");
    const utente = await getCurrentUser();
    const haLogo = fs.existsSync(path.join(process.cwd(), "public", LOGO));

    return (
        <div className="az-shell cd-root">
            <header className="cd-header">
                <div className="cd-header-in">
                    <div className="cd-brand">
                        <span className="cd-logo" aria-hidden="true">
                            {haLogo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={LOGO} alt="" className="cd-logo-img" />
                            ) : (
                                "🥕"
                            )}
                        </span>
                        <div>
                            <div className="cd-brand-nome">{cfg.nome}</div>
                            {cfg.slogan && <div className="cd-brand-sub">{cfg.slogan}</div>}
                        </div>
                    </div>
                    <Link href="/talanton" className="cd-back">
                        ← Portale Talanton
                    </Link>
                </div>
            </header>

            <CaroteDoroClient
                prezzo={{ smeraldi: cfg.smeraldi, carote: cfg.carote }}
                storiaHtml={html(cfg.storia)}
                doveHtml={html(getDoveCarote())}
                regolamentoHtml={html(getRegolamentoCarote())}
                utente={utente ? utente.username : null}
            />

            <footer className="cd-footer">
                {azienda?.titolare ? `Titolare: ${azienda.titolare} · ` : ""}
                Sito informativo: pagamenti e consegne si concordano nel mondo di gioco.
            </footer>
        </div>
    );
}
