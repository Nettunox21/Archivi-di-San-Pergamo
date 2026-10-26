import fs from "fs";
import path from "path";

export type CronologiaTipo = "archivio" | "notizia" | "documento" | "altro";

export type CronologiaEvento = {
    etichetta: string;
    titolo: string;
    /** Indirizzo già risolto (es. /archivio/san-pergamo) oppure stringa vuota */
    href: string;
    tipo: CronologiaTipo | null;
    esterno: boolean;
    descrizione: string;
};

export type CronologiaEra = {
    titolo: string;
    descrizione: string;
    eventi: CronologiaEvento[];
};

export type Cronologia = {
    titolo: string;
    sottotitolo: string;
    ere: CronologiaEra[];
};

const FILE = path.join(process.cwd(), "content/cronologia.md");

function risolviLink(raw: string): Pick<CronologiaEvento, "href" | "tipo" | "esterno"> {
    const link = raw.trim();
    if (!link) return { href: "", tipo: null, esterno: false };

    const m = link.match(/^(archivio|notizie|notizia|documento|documenti):(.+)$/i);
    if (m) {
        const kind = m[1].toLowerCase();
        const slug = m[2].trim();
        if (kind === "archivio") {
            return { href: `/archivio/${encodeURIComponent(slug)}`, tipo: "archivio", esterno: false };
        }
        if (kind === "notizie" || kind === "notizia") {
            return { href: `/notizie/${encodeURIComponent(slug)}`, tipo: "notizia", esterno: false };
        }
        return { href: `/documenti?doc=${encodeURIComponent(slug)}`, tipo: "documento", esterno: false };
    }

    if (/^https?:\/\//i.test(link)) return { href: link, tipo: "altro", esterno: true };
    if (link.startsWith("/")) return { href: link, tipo: "altro", esterno: false };
    return { href: `/${link}`, tipo: "altro", esterno: false };
}

export function getCronologia(): Cronologia {
    const vuota: Cronologia = { titolo: "Linea del tempo", sottotitolo: "", ere: [] };

    let raw: string;
    try {
        raw = fs.readFileSync(FILE, "utf-8");
    } catch {
        return vuota;
    }

    // l'editor di GitHub salva con \r\n: normalizza e toglie i commenti <!-- -->
    const testo = raw.replace(/\r\n?/g, "\n").replace(/<!--[\s\S]*?-->/g, "");

    const out: Cronologia = { ...vuota, ere: [] };
    let era: CronologiaEra | null = null;

    for (const riga0 of testo.split("\n")) {
        const riga = riga0.trim();
        if (!riga) continue;

        if (riga.startsWith("## ")) {
            era = { titolo: riga.slice(3).trim(), descrizione: "", eventi: [] };
            out.ere.push(era);
            continue;
        }

        if (riga.startsWith("# ")) {
            out.titolo = riga.slice(2).trim();
            continue;
        }

        if (riga.startsWith(">")) {
            const t = riga.replace(/^>\s?/, "").trim();
            if (era) era.descrizione = era.descrizione ? `${era.descrizione} ${t}` : t;
            else out.sottotitolo = out.sottotitolo ? `${out.sottotitolo} ${t}` : t;
            continue;
        }

        if (riga.startsWith("- ") || riga.startsWith("* ")) {
            // evento prima di qualunque "## Era": finisce in un'era senza titolo
            if (!era) {
                era = { titolo: "", descrizione: "", eventi: [] };
                out.ere.push(era);
            }
            const parti = riga.slice(2).split("|").map((p) => p.trim());
            const [etichetta = "", titolo = "", link = "", ...resto] = parti;
            if (!titolo && !etichetta) continue;

            era.eventi.push({
                etichetta: titolo ? etichetta : "",
                titolo: titolo || etichetta,
                ...risolviLink(link),
                descrizione: resto.join(" | ").trim(),
            });
        }
    }

    return out;
}
