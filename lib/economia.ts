import { db, eq } from "@/lib/db";
import { daTesto } from "@/lib/numeri";
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
export type FarmCosto = { risorsaId: number; quantita: bigint };
export type Farm = {
    id: number;
    fazione: string;
    nome: string;
    descrizione: string;
    prodottoId: number;
    prodottoQuantita: bigint;
    tempoSecondi: number;
    costi: FarmCosto[];
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
export type VoceRegistro = {
    id: number;
    username: string;
    fazione: string;
    azione: string;
    dettaglio: string;
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
    prodotto_id: number;
    prodotto_quantita: string;
    tempo_secondi: number;
    farm_costi: { risorsa_id: number; quantita: string }[];
};

export async function caricaEconomia(): Promise<DatiEconomia> {
    try {
        const [r, a, p, f, s] = await Promise.all([
            db<{ id: number; nome: string; valore: string }[]>("/risorse?select=id,nome,valore&order=nome.asc"),
            db<{ username: string; fazione: string; ruolo: Ruolo }[]>("/appartenenze?select=username,fazione,ruolo"),
            db<{ fazione: string; risorsa_id: number; quantita: string }[]>("/possedimenti?select=fazione,risorsa_id,quantita"),
            db<RigaFarm[]>("/farm?select=id,fazione,nome,descrizione,prodotto_id,prodotto_quantita,tempo_secondi,farm_costi(risorsa_id,quantita)&order=id.asc"),
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
                prodottoId: x.prodotto_id,
                prodottoQuantita: daTesto(x.prodotto_quantita),
                tempoSecondi: x.tempo_secondi,
                costi: (x.farm_costi || []).map((c) => ({ risorsaId: c.risorsa_id, quantita: daTesto(c.quantita) })),
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

export async function caricaRegistro(fazione: string, limite = 25): Promise<VoceRegistro[]> {
    try {
        const rows = await db<
            { id: number; username: string; fazione: string; azione: string; dettaglio: string; created_at: string }[]
        >(`/registro?fazione=${eq(fazione)}&select=id,username,fazione,azione,dettaglio,created_at&order=created_at.desc&limit=${limite}`);
        return rows.map((x) => ({
            id: x.id,
            username: x.username,
            fazione: x.fazione,
            azione: x.azione,
            dettaglio: x.dettaglio,
            creatoIl: x.created_at,
        }));
    } catch {
        return [];
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
    ricavo: bigint; // per utilizzo
    costo: bigint; // per utilizzo
    profitto: bigint; // per utilizzo (può essere negativo)
    profittoOra: bigint;
};

export function calcolaFarm(farm: Farm, valori: Map<number, bigint>): ConteggioFarm {
    const ricavo = farm.prodottoQuantita * (valori.get(farm.prodottoId) ?? 0n);
    let costo = 0n;
    for (const c of farm.costi) costo += c.quantita * (valori.get(c.risorsaId) ?? 0n);
    const profitto = ricavo - costo;
    const profittoOra = farm.tempoSecondi > 0 ? (profitto * 3600n) / BigInt(farm.tempoSecondi) : 0n;
    return { ricavo, costo, profitto, profittoOra };
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

/* ---------- Registro modifiche ---------- */

export async function registra(username: string, fazione: string, azione: string, dettaglio: string) {
    try {
        await db("/registro", {
            method: "POST",
            prefer: "return=minimal",
            body: { username, fazione, azione, dettaglio: dettaglio.slice(0, 300) },
        });
    } catch {
        /* il registro non deve mai bloccare un'operazione */
    }
}
