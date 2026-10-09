// Elenco fazioni per l'economia: nessuna dipendenza dal server, usabile anche nelle pagine client.
import { factions } from "@/app/data/factions";

/** ID stabile e unico per l'economia, ricavato dal nome ("Lil'Pisa" -> "lil-pisa"). */
export function fazioneId(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

export type FazioneEcon = { id: string; name: string; banner: string; description: string };

export const fazioniEcon: FazioneEcon[] = factions.map((f) => ({
    id: fazioneId(f.name),
    name: f.name,
    banner: f.banner,
    description: f.description,
}));

export const trovaFazione = (id: string) => fazioniEcon.find((f) => f.id === id) ?? null;
