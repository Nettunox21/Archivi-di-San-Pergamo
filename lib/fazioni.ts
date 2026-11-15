// Elenco fazioni per l'economia: nessuna dipendenza dal server, usabile anche nelle pagine client.
import { factions, type TipoFazione } from "@/app/data/factions";

/** ID stabile e unico per l'economia, ricavato dal nome ("Lil'Pisa" -> "lil-pisa"). */
export function fazioneId(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export type FazioneEcon = { id: string; name: string; banner: string; description: string; tipo: TipoFazione };

/** Tutte le voci, istituti compresi: serve a riconoscere gli ID già presenti nei dati salvati. */
const tutte: FazioneEcon[] = factions.map((f) => ({
    id: fazioneId(f.name),
    name: f.name,
    banner: f.banner,
    description: f.description,
    tipo: f.tipo,
}));

/** Gli istituti stanno dentro le nazioni: non hanno una economia propria. */
export const haEconomia = (f: FazioneEcon) => f.tipo !== "istituto";

/** Solo le voci con economia propria (liste, classifiche, menu a tendina). */
export const fazioniEcon: FazioneEcon[] = tutte.filter(haEconomia);

/** Cerca tra TUTTE le voci (anche gli istituti), così i dati già salvati restano validi. */
export const trovaFazione = (id: string) => tutte.find((f) => f.id === id) ?? null;
