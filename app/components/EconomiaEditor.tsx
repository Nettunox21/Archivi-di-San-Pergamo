"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inParole, parseNumero } from "@/lib/numeri";

type Risorsa = { id: number; nome: string; valore: string };
type Possedimento = { risorsaId: number; quantita: string };
type Costo = { risorsaId: number; quantita: string };
type FarmDati = {
    id: number;
    nome: string;
    descrizione: string;
    prodottoId: number;
    prodottoQuantita: string;
    tempoSecondi: number;
    costi: Costo[];
};
type ScambioDati = { id: number; con: string; descrizione: string; data: string };
type VoceRegistro = { id: number; username: string; azione: string; dettaglio: string; quando: string };

type Props = {
    fazione: { id: string; name: string };
    risorse: Risorsa[];
    possedimenti: Possedimento[];
    farm: FarmDati[];
    scambi: ScambioDati[];
    altreFazioni: { id: string; name: string }[];
    documenti: { slug: string; title: string }[];
    registro: VoceRegistro[];
};

const UNITA_TEMPO = [
    { nome: "secondi", s: 1 },
    { nome: "minuti", s: 60 },
    { nome: "ore", s: 3600 },
    { nome: "giorni", s: 86400 },
];

/** Campo numerico con anteprima a parole ("3,5 triliardi"). */
function CampoNumero({
    value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    const n = parseNumero(value);
    return (
        <div className="eco-campo-num">
            <input
                className="admin-user-input"
                inputMode="numeric"
                value={value}
                placeholder={placeholder ?? "0"}
                onChange={(e) => onChange(e.target.value)}
            />
            <small className={value && n === null ? "eco-errore" : ""}>
                {value === "" ? " " : n === null ? "Numero non valido" : `= ${inParole(n)}`}
            </small>
        </div>
    );
}

export default function EconomiaEditor(props: Props) {
    const { fazione, risorse, possedimenti, farm, scambi, altreFazioni, documenti, registro } = props;
    const router = useRouter();
    const [scheda, setScheda] = useState<"risorse" | "farm" | "scambi" | "registro">("risorse");
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);
    const [occupato, setOccupato] = useState(false);

    const nomeRisorsa = (id: number) => risorse.find((r) => r.id === id)?.nome ?? "?";

    async function chiama(metodo: string, url: string, body: unknown, okMsg: string): Promise<boolean> {
        setOccupato(true);
        setMsg(null);
        try {
            const res = await fetch(url, {
                method: metodo,
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setMsg({ testo: data.error || "Errore", ok: false });
                return false;
            }
            setMsg({ testo: okMsg, ok: true });
            router.refresh();
            return true;
        } catch {
            setMsg({ testo: "Errore di rete", ok: false });
            return false;
        } finally {
            setOccupato(false);
        }
    }

    /* ---------- Risorse ---------- */
    const [nuovaRis, setNuovaRis] = useState<string>("");
    const [nuovaQta, setNuovaQta] = useState("");
    const [modifiche, setModifiche] = useState<Record<number, string>>({});

    async function impostaRisorsa(risorsaId: number, quantita: string) {
        const ok = await chiama("PUT", "/api/economia/possedimenti", { fazione: fazione.id, risorsaId, quantita }, "Quantità salvata");
        if (ok) {
            setModifiche((m) => {
                const c = { ...m };
                delete c[risorsaId];
                return c;
            });
        }
        return ok;
    }

    /* ---------- Farm ---------- */
    type Bozza = {
        id: number | null;
        nome: string;
        descrizione: string;
        prodottoId: string;
        prodottoQuantita: string;
        tempoValore: string;
        tempoUnita: number;
        costi: { risorsaId: string; quantita: string }[];
    };
    const bozzaVuota = (): Bozza => ({
        id: null, nome: "", descrizione: "", prodottoId: "", prodottoQuantita: "",
        tempoValore: "", tempoUnita: 60, costi: [],
    });
    const [bozza, setBozza] = useState<Bozza | null>(null);

    function modificaFarm(f: FarmDati) {
        const unita = [...UNITA_TEMPO].reverse().find((u) => f.tempoSecondi % u.s === 0) ?? UNITA_TEMPO[0];
        setBozza({
            id: f.id,
            nome: f.nome,
            descrizione: f.descrizione,
            prodottoId: String(f.prodottoId),
            prodottoQuantita: f.prodottoQuantita,
            tempoValore: String(f.tempoSecondi / unita.s),
            tempoUnita: unita.s,
            costi: f.costi.map((c) => ({ risorsaId: String(c.risorsaId), quantita: c.quantita })),
        });
    }

    async function salvaFarm() {
        if (!bozza) return;
        const tempo = Number(bozza.tempoValore.replace(",", "."));
        const tempoSecondi = Math.round(tempo * bozza.tempoUnita);
        const payload = {
            id: bozza.id,
            fazione: fazione.id,
            nome: bozza.nome,
            descrizione: bozza.descrizione,
            prodottoId: Number(bozza.prodottoId),
            prodottoQuantita: bozza.prodottoQuantita,
            tempoSecondi,
            costi: bozza.costi
                .filter((c) => c.risorsaId && c.quantita)
                .map((c) => ({ risorsaId: Number(c.risorsaId), quantita: c.quantita })),
        };
        const ok = await chiama(bozza.id ? "PUT" : "POST", "/api/economia/farm", payload, bozza.id ? "Farm aggiornata" : "Farm creata");
        if (ok) setBozza(null);
    }

    /* ---------- Scambi ---------- */
    const [altra, setAltra] = useState("");
    const [descr, setDescr] = useState("");
    const [docs, setDocs] = useState<string[]>([]);

    async function registraScambio() {
        const ok = await chiama(
            "POST", "/api/economia/scambi",
            { fazioneA: fazione.id, fazioneB: altra, descrizione: descr, documenti: docs },
            "Scambio registrato"
        );
        if (ok) { setAltra(""); setDescr(""); setDocs([]); }
    }

    return (
        <section className="eco-box eco-editor">
            <h2>Gestione di {fazione.name}</h2>
            <p className="eco-sotto">Sei sovrano o vice di questa fazione: puoi modificare risorse, farm e scambi.</p>

            <div className="eco-schede" role="tablist">
                {(["risorse", "farm", "scambi", "registro"] as const).map((s) => (
                    <button
                        key={s}
                        role="tab"
                        aria-selected={scheda === s}
                        className={scheda === s ? "is-attiva" : ""}
                        onClick={() => { setScheda(s); setMsg(null); }}
                    >
                        {s === "risorse" ? "Risorse" : s === "farm" ? "Farm" : s === "scambi" ? "Scambi" : "Registro"}
                    </button>
                ))}
            </div>

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}

            {scheda === "risorse" && (
                <div className="eco-pannello">
                    <h3>Aggiungi o aggiorna una risorsa</h3>
                    <div className="eco-form-riga">
                        <select className="admin-user-input" value={nuovaRis} onChange={(e) => setNuovaRis(e.target.value)}>
                            <option value="">Scegli una risorsa…</option>
                            {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                        </select>
                        <CampoNumero value={nuovaQta} onChange={setNuovaQta} placeholder="Quantità" />
                        <button
                            className="admin-user-save-btn"
                            disabled={occupato || !nuovaRis || parseNumero(nuovaQta) === null}
                            onClick={async () => {
                                if (await impostaRisorsa(Number(nuovaRis), nuovaQta)) { setNuovaRis(""); setNuovaQta(""); }
                            }}
                        >
                            Imposta
                        </button>
                    </div>
                    {risorse.length === 0 && <p className="eco-vuoto">Il catalogo è vuoto: l&apos;admin deve prima creare le risorse.</p>}

                    <h3>Risorse possedute</h3>
                    {possedimenti.length === 0 && <p className="eco-vuoto">Nessuna risorsa.</p>}
                    <ul className="eco-lista-edit">
                        {possedimenti.map((p) => {
                            const valore = modifiche[p.risorsaId] ?? p.quantita;
                            return (
                                <li key={p.risorsaId}>
                                    <strong>{nomeRisorsa(p.risorsaId)}</strong>
                                    <CampoNumero value={valore} onChange={(v) => setModifiche((m) => ({ ...m, [p.risorsaId]: v }))} />
                                    <button
                                        className="admin-user-save-btn"
                                        disabled={occupato || valore === p.quantita || parseNumero(valore) === null}
                                        onClick={() => impostaRisorsa(p.risorsaId, valore)}
                                    >
                                        Salva
                                    </button>
                                    <button
                                        className="admin-delete-btn"
                                        disabled={occupato}
                                        onClick={() => {
                                            if (confirm(`Rimuovere ${nomeRisorsa(p.risorsaId)} dalla fazione?`))
                                                chiama("DELETE", "/api/economia/possedimenti", { fazione: fazione.id, risorsaId: p.risorsaId }, "Risorsa rimossa");
                                        }}
                                    >
                                        Rimuovi
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {scheda === "farm" && (
                <div className="eco-pannello">
                    {!bozza && (
                        <>
                            <button className="admin-user-save-btn" onClick={() => setBozza(bozzaVuota())}>+ Nuova farm</button>
                            <ul className="eco-lista-edit">
                                {farm.map((f) => (
                                    <li key={f.id}>
                                        <strong>{f.nome}</strong>
                                        <span className="eco-sotto">produce {nomeRisorsa(f.prodottoId)}</span>
                                        <button className="admin-user-save-btn" onClick={() => modificaFarm(f)}>Modifica</button>
                                        <button
                                            className="admin-delete-btn"
                                            disabled={occupato}
                                            onClick={() => {
                                                if (confirm(`Eliminare la farm "${f.nome}"?`))
                                                    chiama("DELETE", "/api/economia/farm", { id: f.id, fazione: fazione.id }, "Farm eliminata");
                                            }}
                                        >
                                            Elimina
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {farm.length === 0 && <p className="eco-vuoto">Nessuna farm.</p>}
                        </>
                    )}

                    {bozza && (
                        <div className="eco-form-colonna">
                            <h3>{bozza.id ? "Modifica farm" : "Nuova farm"}</h3>
                            <label>Nome
                                <input className="admin-user-input" maxLength={80} value={bozza.nome} onChange={(e) => setBozza({ ...bozza, nome: e.target.value })} />
                            </label>
                            <label>Descrizione (facoltativa)
                                <input className="admin-user-input" maxLength={300} value={bozza.descrizione} onChange={(e) => setBozza({ ...bozza, descrizione: e.target.value })} />
                            </label>
                            <label>Cosa produce
                                <select className="admin-user-input" value={bozza.prodottoId} onChange={(e) => setBozza({ ...bozza, prodottoId: e.target.value })}>
                                    <option value="">Scegli una risorsa…</option>
                                    {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                                </select>
                            </label>
                            <label>Quantità prodotta per utilizzo
                                <CampoNumero value={bozza.prodottoQuantita} onChange={(v) => setBozza({ ...bozza, prodottoQuantita: v })} />
                            </label>
                            <label>Tempo di produzione
                                <span className="eco-form-riga">
                                    <input
                                        className="admin-user-input" inputMode="decimal" value={bozza.tempoValore}
                                        onChange={(e) => setBozza({ ...bozza, tempoValore: e.target.value })}
                                    />
                                    <select className="admin-user-input" value={bozza.tempoUnita} onChange={(e) => setBozza({ ...bozza, tempoUnita: Number(e.target.value) })}>
                                        {UNITA_TEMPO.map((u) => <option key={u.s} value={u.s}>{u.nome}</option>)}
                                    </select>
                                </span>
                            </label>

                            <h3>Costi per ogni utilizzo</h3>
                            {bozza.costi.map((c, i) => (
                                <div key={i} className="eco-form-riga">
                                    <select
                                        className="admin-user-input" value={c.risorsaId}
                                        onChange={(e) => setBozza({ ...bozza, costi: bozza.costi.map((x, j) => (j === i ? { ...x, risorsaId: e.target.value } : x)) })}
                                    >
                                        <option value="">Scegli una risorsa…</option>
                                        {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                                    </select>
                                    <CampoNumero
                                        value={c.quantita}
                                        onChange={(v) => setBozza({ ...bozza, costi: bozza.costi.map((x, j) => (j === i ? { ...x, quantita: v } : x)) })}
                                    />
                                    <button className="admin-delete-btn" onClick={() => setBozza({ ...bozza, costi: bozza.costi.filter((_, j) => j !== i) })}>Togli</button>
                                </div>
                            ))}
                            <button className="admin-user-save-btn" onClick={() => setBozza({ ...bozza, costi: [...bozza.costi, { risorsaId: "", quantita: "" }] })}>+ Aggiungi costo</button>

                            <div className="eco-form-riga">
                                <button
                                    className="admin-user-save-btn"
                                    disabled={occupato || !bozza.nome.trim() || !bozza.prodottoId || parseNumero(bozza.prodottoQuantita) === null || !(Number(bozza.tempoValore.replace(",", ".")) > 0)}
                                    onClick={salvaFarm}
                                >
                                    Salva farm
                                </button>
                                <button className="admin-delete-btn" onClick={() => setBozza(null)}>Annulla</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {scheda === "scambi" && (
                <div className="eco-pannello">
                    <h3>Registra uno scambio</h3>
                    <p className="eco-sotto">Lo scambio è solo un registro: le quantità delle risorse vanno aggiornate a parte, nella scheda Risorse.</p>
                    <div className="eco-form-colonna">
                        <label>Con quale fazione
                            <select className="admin-user-input" value={altra} onChange={(e) => setAltra(e.target.value)}>
                                <option value="">Scegli…</option>
                                {altreFazioni.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                        </label>
                        <label>Cosa è stato scambiato
                            <textarea className="admin-user-input" rows={3} maxLength={500} value={descr} onChange={(e) => setDescr(e.target.value)} />
                        </label>
                        {documenti.length > 0 && (
                            <fieldset className="eco-docs">
                                <legend>Documenti allegati</legend>
                                {documenti.map((d) => (
                                    <label key={d.slug} className="eco-check">
                                        <input
                                            type="checkbox"
                                            checked={docs.includes(d.slug)}
                                            onChange={(e) => setDocs(e.target.checked ? [...docs, d.slug] : docs.filter((x) => x !== d.slug))}
                                        />
                                        {d.title}
                                    </label>
                                ))}
                            </fieldset>
                        )}
                        <button className="admin-user-save-btn" disabled={occupato || !altra || !descr.trim()} onClick={registraScambio}>
                            Registra scambio
                        </button>
                    </div>

                    <h3>Scambi registrati</h3>
                    {scambi.length === 0 && <p className="eco-vuoto">Nessuno scambio.</p>}
                    <ul className="eco-lista-edit">
                        {scambi.map((s) => (
                            <li key={s.id}>
                                <span><strong>{s.con}</strong> · {s.data}</span>
                                <span className="eco-sotto">{s.descrizione.slice(0, 80)}{s.descrizione.length > 80 ? "…" : ""}</span>
                                <button
                                    className="admin-delete-btn"
                                    disabled={occupato}
                                    onClick={() => {
                                        if (confirm("Eliminare questo scambio?"))
                                            chiama("DELETE", "/api/economia/scambi", { id: s.id }, "Scambio eliminato");
                                    }}
                                >
                                    Elimina
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {scheda === "registro" && (
                <div className="eco-pannello">
                    <h3>Ultime modifiche</h3>
                    {registro.length === 0 && <p className="eco-vuoto">Nessuna modifica registrata.</p>}
                    <ul className="eco-registro">
                        {registro.map((v) => (
                            <li key={v.id}>
                                <time>{v.quando}</time> <strong>{v.username}</strong> — {v.dettaglio}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    );
}
