import { db, eq } from "@/lib/db";
import { daTesto, perPeriodo } from "@/lib/numeri";
import type { User } from "@/auth/users";

/* ---------- Fazioni ---------- */

export { fazioneId, fazioniEcon, trovaFazione } from "@/lib/fazioni";
export type { FazioneEcon } from "@/lib/fazioni";

/* ---------- Tipi ---------- */

export type Ruolo = "sovrano" | "vice" | "civile";
export const RUOLI: Ruolo[] = ["sovrano", "vice", "civile"];

export type Risorsa = { id: number; nome: string; valore: bigint };
export type Appartenenza = { username: string; fazione: string; ruolo: Ruolo };
export type Possedimento = { fazione: string; risorsaId: number; quantita: bigint };
export type FarmVoce = { risorsaId: number; quantita: bigint };
export type Farm = {
    id: number;
    fazione: string;
    nome: string;
    descrizione: string;
    /** true = produce da sola, senza intervento del giocatore; tempoSecondi è la durata di un ciclo */
    passiva: boolean;
    /** durata di un utilizzo (farm attiva) o di un ciclo (farm passiva) */
    tempoSecondi: number;
    prodotti: FarmVoce[];
    costi: FarmVoce[];
};
export type Scambio = {
    id: number;
    fazioneA: string;
    fazioneB: string;
    descrizione: string;
    documenti: string[];
    creatoDa: string;
    creatoIl: string;
};
export type DatiEconomia = {
    errore: string | null;
    risorse: Risorsa[];
    appartenenze: Appartenenza[];
    possedimenti: Possedimento[];
    farm: Farm[];
    scambi: Scambio[];
};

/* ---------- Caricamento ---------- */

type RigaFarm = {
    id: number;
    fazione: string;
    nome: string;
    descrizione: string;
    passiva: boolean;
    tempo_secondi: number;
    farm_prodotti: { risorsa_id: number; quantita: string }[];
    farm_costi: { risorsa_id: number; quantita: string }[];
};

const voci = (r: { risorsa_id: number; quantita: string }[] | null): FarmVoce[] =>
    (r || []).map((x) => ({ risorsaId: x.risorsa_id, quantita: daTesto(x.quantita) }));

export async function caricaEconomia(): Promise<DatiEconomia> {
    try {
        const [r, a, p, f, s] = await Promise.all([
            db<{ id: number; nome: string; valore: string }[]>("/risorse?select=id,nome,valore&order=nome.asc"),
            db<{ username: string; fazione: string; ruolo: Ruolo }[]>("/appartenenze?select=username,fazione,ruolo"),
            db<{ fazione: string; risorsa_id: number; quantita: string }[]>("/possedimenti?select=fazione,risorsa_id,quantita"),
            db<RigaFarm[]>("/farm?select=id,fazione,nome,descrizione,passiva,tempo_secondi,farm_prodotti(risorsa_id,quantita),farm_costi(risorsa_id,quantita)&order=id.asc"),
            db<{ id: number; fazione_a: string; fazione_b: string; descrizione: string; documenti: string[]; created_by: string; created_at: string }[]>(
                "/scambi?select=id,fazione_a,fazione_b,descrizione,documenti,created_by,created_at&order=created_at.desc&limit=200"
            ),
        ]);

        return {
            errore: null,
            risorse: r.map((x) => ({ id: x.id, nome: x.nome, valore: daTesto(x.valore) })),
            appartenenze: a,
            possedimenti: p.map((x) => ({ fazione: x.fazione, risorsaId: x.risorsa_id, quantita: daTesto(x.quantita) })),
            farm: f.map((x) => ({
                id: x.id,
                fazione: x.fazione,
                nome: x.nome,
                descrizione: x.descrizione,
                passiva: !!x.passiva,
                tempoSecondi: x.tempo_secondi,
                prodotti: voci(x.farm_prodotti),
                costi: voci(x.farm_costi),
            })),
            scambi: s.map((x) => ({
                id: x.id,
                fazioneA: x.fazione_a,
                fazioneB: x.fazione_b,
                descrizione: x.descrizione,
                documenti: x.documenti || [],
                creatoDa: x.created_by,
                creatoIl: x.created_at,
            })),
        };
    } catch (e) {
        return {
            errore: e instanceof Error ? e.message : "Errore sconosciuto",
            risorse: [],
            appartenenze: [],
            possedimenti: [],
            farm: [],
            scambi: [],
        };
    }
}

/* ---------- Calcoli (tutti nel codice, in BigInt) ---------- */

export const mappaValori = (risorse: Risorsa[]) => new Map(risorse.map((r) => [r.id, r.valore]));

export function patrimonioFazione(fazione: string, dati: DatiEconomia): bigint {
    const valori = mappaValori(dati.risorse);
    let tot = 0n;
    for (const p of dati.possedimenti) {
        if (p.fazione === fazione) tot += p.quantita * (valori.get(p.risorsaId) ?? 0n);
    }
    return tot;
}

export function patrimonioMondiale(dati: DatiEconomia): bigint {
    const valori = mappaValori(dati.risorse);
    let tot = 0n;
    for (const p of dati.possedimenti) tot += p.quantita * (valori.get(p.risorsaId) ?? 0n);
    return tot;
}

export type ConteggioFarm = {
    ricavo: bigint; // per utilizzo (attiva) o per ciclo (passiva)
    costo: bigint; // per utilizzo o per ciclo
    profitto: bigint; // per utilizzo o per ciclo (può essere negativo)
    profittoOra: bigint;
    profittoGiorno: bigint;
};

const somma = (v: FarmVoce[], valori: Map<number, bigint>) =>
    v.reduce((tot, x) => tot + x.quantita * (valori.get(x.risorsaId) ?? 0n), 0n);

export function calcolaFarm(farm: Farm, valori: Map<number, bigint>): ConteggioFarm {
    const ricavo = somma(farm.prodotti, valori);
    const costo = somma(farm.costi, valori);
    const profitto = ricavo - costo;
    return {
        ricavo,
        costo,
        profitto,
        profittoOra: perPeriodo(profitto, farm.tempoSecondi, 3600),
        profittoGiorno: perPeriodo(profitto, farm.tempoSecondi, 86400),
    };
}

/* ---------- Permessi ---------- */

export function ruoloUtente(username: string, fazione: string, appartenenze: Appartenenza[]): Ruolo | null {
    return appartenenze.find((a) => a.username === username && a.fazione === fazione)?.ruolo ?? null;
}

/** Admin, oppure sovrano/vice della fazione. I civili non possono modificare. */
export function puoModificareDa(user: User | null, fazione: string, appartenenze: Appartenenza[]): boolean {
    if (!user) return false;
    if (user.role === "admin") return true;
    const r = ruoloUtente(user.username, fazione, appartenenze);
    return r === "sovrano" || r === "vice";
}

/** Versione per le API: interroga il database solo per questo utente. */
export async function puoModificare(user: User | null, fazione: string): Promise<boolean> {
    if (!user) return false;
    if (user.role === "admin") return true;
    try {
        const rows = await db<{ ruolo: Ruolo }[]>(
            `/appartenenze?username=${eq(user.username)}&fazione=${eq(fazione)}&select=ruolo`
        );
        const r = rows?.[0]?.ruolo;
        return r === "sovrano" || r === "vice";
    } catch {
        return false;
    }
}
