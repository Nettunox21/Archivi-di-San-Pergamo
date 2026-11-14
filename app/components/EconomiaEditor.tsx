"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_CIFRE, inParole, parseNumero, raggruppa } from "@/lib/numeri";

type Risorsa = { id: number; nome: string; valore: string };
type Possedimento = { risorsaId: number; quantita: string };
type Voce = { risorsaId: number; quantita: string };
type FarmDati = {
    id: number;
    nome: string;
    descrizione: string;
    passiva: boolean;
    tempoSecondi: number;
    prodotti: Voce[];
    costi: Voce[];
};
type ScambioDati = { id: number; con: string; descrizione: string; data: string };

type Props = {
    fazione: { id: string; name: string };
    risorse: Risorsa[];
    possedimenti: Possedimento[];
    farm: FarmDati[];
    scambi: ScambioDati[];
    altreFazioni: { id: string; name: string }[];
    documenti: { slug: string; title: string }[];
};

type Modo = "imposta" | "aggiungi" | "sottrai";
const MODI: { v: Modo; nome: string }[] = [
    { v: "aggiungi", nome: "Aggiungi" },
    { v: "sottrai", nome: "Sottrai" },
    { v: "imposta", nome: "Imposta" },
];

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

/** Risultato di un'operazione sulla quantità, calcolato nel browser solo per l'anteprima. */
function calcolaNuovo(attuale: bigint, modo: Modo, importo: bigint | null): { nuovo: bigint | null; errore: string | null } {
    if (importo === null) return { nuovo: null, errore: null };
    if (modo === "imposta") return { nuovo: importo, errore: null };
    if (modo === "aggiungi") {
        const n = attuale + importo;
        return n.toString().length > MAX_CIFRE
            ? { nuovo: null, errore: `Il risultato supera il limite di ${MAX_CIFRE} cifre` }
            : { nuovo: n, errore: null };
    }
    return importo > attuale
        ? { nuovo: null, errore: "Non puoi sottrarre più di quello che la fazione possiede" }
        : { nuovo: attuale - importo, errore: null };
}

/** Scelta Aggiungi / Sottrai / Imposta, importo e anteprima "Attuale → Nuovo". */
function ModificaQuantita({
    attuale, disabilitato, etichetta, onApplica,
}: {
    attuale: bigint;
    disabilitato?: boolean;
    etichetta?: string;
    onApplica: (modo: Modo, importo: string) => Promise<boolean>;
}) {
    const [modo, setModo] = useState<Modo>("aggiungi");
    const [importo, setImporto] = useState("");
    const n = parseNumero(importo);
    const { nuovo, errore } = calcolaNuovo(attuale, modo, n);

    return (
        <div className="eco-quantita">
            <div className="eco-modi" role="group" aria-label="Come modificare la quantità">
                {MODI.map((m) => (
                    <button
                        key={m.v}
                        type="button"
                        className={modo === m.v ? "is-attivo" : ""}
                        aria-pressed={modo === m.v}
                        onClick={() => setModo(m.v)}
                    >
                        {m.nome}
                    </button>
                ))}
            </div>
            <div className="eco-form-riga">
                <CampoNumero value={importo} onChange={setImporto} placeholder={modo === "imposta" ? "Nuova quantità" : "Quantità"} />
                <button
                    className="admin-user-save-btn"
                    disabled={disabilitato || n === null || errore !== null}
                    onClick={async () => {
                        if (await onApplica(modo, importo)) setImporto("");
                    }}
                >
                    {etichetta ?? "Applica"}
                </button>
            </div>
            <small className={errore ? "eco-errore" : "eco-anteprima"}>
                {errore ?? (
                    <>
                        Attuale: <b title={raggruppa(attuale)}>{inParole(attuale)}</b>
                        {nuovo !== null && (
                            <> → Nuova: <b title={raggruppa(nuovo)}>{inParole(nuovo)}</b></>
                        )}
                    </>
                )}
            </small>
        </div>
    );
}

/** Elenco di righe (risorsa + quantità) per produzione e costi delle farm. */
function ListaVoci({
    voci, setVoci, risorse, aggiungi, minimo = 0,
}: {
    voci: { risorsaId: string; quantita: string }[];
    setVoci: (v: { risorsaId: string; quantita: string }[]) => void;
    risorse: Risorsa[];
    aggiungi: string;
    minimo?: number;
}) {
    return (
        <>
            {voci.map((c, i) => (
                <div key={i} className="eco-form-riga">
                    <select
                        className="admin-user-input"
                        value={c.risorsaId}
                        onChange={(e) => setVoci(voci.map((x, j) => (j === i ? { ...x, risorsaId: e.target.value } : x)))}
                    >
                        <option value="">Scegli una risorsa…</option>
                        {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                    </select>
                    <CampoNumero
                        value={c.quantita}
                        onChange={(v) => setVoci(voci.map((x, j) => (j === i ? { ...x, quantita: v } : x)))}
                    />
                    {voci.length > minimo && (
                        <button type="button" className="admin-delete-btn" onClick={() => setVoci(voci.filter((_, j) => j !== i))}>
                            Togli
                        </button>
                    )}
                </div>
            ))}
            <button type="button" className="admin-user-save-btn" onClick={() => setVoci([...voci, { risorsaId: "", quantita: "" }])}>
                {aggiungi}
            </button>
        </>
    );
}

export default function EconomiaEditor(props: Props) {
    const { fazione, risorse, possedimenti, farm, scambi, altreFazioni, documenti } = props;
    const router = useRouter();
    const [scheda, setScheda] = useState<"risorse" | "farm" | "scambi">("risorse");
    const [msg, setMsg] = useState<{ testo: string; ok: boolean } | null>(null);
    const [occupato, setOccupato] = useState(false);

    const nomeRisorsa = (id: number) => risorse.find((r) => r.id === id)?.nome ?? "?";
    const attualeDi = (id: number | null): bigint => {
        const q = possedimenti.find((p) => p.risorsaId === id)?.quantita;
        return (q ? parseNumero(q) : null) ?? 0n;
    };

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

    const MSG_MODO: Record<Modo, string> = {
        imposta: "Quantità impostata",
        aggiungi: "Quantità aggiunta",
        sottrai: "Quantità sottratta",
    };

    function modificaQuantita(risorsaId: number) {
        return (modo: Modo, quantita: string) =>
            chiama("PUT", "/api/economia/possedimenti", { fazione: fazione.id, risorsaId, quantita, modo }, MSG_MODO[modo]);
    }

    /* ---------- Farm ---------- */
    type Bozza = {
        id: number | null;
        nome: string;
        descrizione: string;
        passiva: boolean;
        tempoValore: string;
        tempoUnita: number;
        prodotti: { risorsaId: string; quantita: string }[];
        costi: { risorsaId: string; quantita: string }[];
    };
    const bozzaVuota = (): Bozza => ({
        id: null, nome: "", descrizione: "", passiva: false,
        tempoValore: "", tempoUnita: 60,
        prodotti: [{ risorsaId: "", quantita: "" }], costi: [],
    });
    const [bozza, setBozza] = useState<Bozza | null>(null);

    function modificaFarm(f: FarmDati) {
        const unita = [...UNITA_TEMPO].reverse().find((u) => f.tempoSecondi % u.s === 0) ?? UNITA_TEMPO[0];
        setBozza({
            id: f.id,
            nome: f.nome,
            descrizione: f.descrizione,
            passiva: f.passiva,
            tempoValore: String(f.tempoSecondi / unita.s),
            tempoUnita: unita.s,
            prodotti: f.prodotti.map((c) => ({ risorsaId: String(c.risorsaId), quantita: c.quantita })),
            costi: f.costi.map((c) => ({ risorsaId: String(c.risorsaId), quantita: c.quantita })),
        });
    }

    const vociValide = (v: { risorsaId: string; quantita: string }[]) =>
        v
            .filter((c) => c.risorsaId && parseNumero(c.quantita) !== null && parseNumero(c.quantita) !== 0n)
            .map((c) => ({ risorsaId: Number(c.risorsaId), quantita: c.quantita }));

    async function salvaFarm() {
        if (!bozza) return;
        const tempo = Number(bozza.tempoValore.replace(",", "."));
        const tempoSecondi = Math.round(tempo * bozza.tempoUnita);
        const payload = {
            id: bozza.id,
            fazione: fazione.id,
            nome: bozza.nome,
            descrizione: bozza.descrizione,
            passiva: bozza.passiva,
            tempoSecondi,
            prodotti: vociValide(bozza.prodotti),
            costi: vociValide(bozza.costi),
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
                {(["risorse", "farm", "scambi"] as const).map((s) => (
                    <button
                        key={s}
                        role="tab"
                        aria-selected={scheda === s}
                        className={scheda === s ? "is-attiva" : ""}
                        onClick={() => { setScheda(s); setMsg(null); }}
                    >
                        {s === "risorse" ? "Risorse" : s === "farm" ? "Farm" : "Scambi"}
                    </button>
                ))}
            </div>

            {msg && <p className={msg.ok ? "eco-msg-ok" : "eco-errore"} role="status">{msg.testo}</p>}

            {scheda === "risorse" && (
                <div className="eco-pannello">
                    <h3>Aggiungi o aggiorna una risorsa</h3>
                    <div className="eco-form-colonna">
                        <select className="admin-user-input" value={nuovaRis} onChange={(e) => setNuovaRis(e.target.value)}>
                            <option value="">Scegli una risorsa…</option>
                            {risorse.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                        </select>
                        <ModificaQuantita
                            key={nuovaRis}
                            attuale={attualeDi(nuovaRis ? Number(nuovaRis) : null)}
                            disabilitato={occupato || !nuovaRis}
                            onApplica={(modo, q) => modificaQuantita(Number(nuovaRis))(modo, q)}
                        />
                    </div>
                    {risorse.length === 0 && <p className="eco-vuoto">Il catalogo è vuoto: l&apos;admin deve prima creare le risorse.</p>}

                    <h3>Risorse possedute</h3>
                    {possedimenti.length === 0 && <p className="eco-vuoto">Nessuna risorsa.</p>}
                    <ul className="eco-lista-edit">
                        {possedimenti.map((p) => (
                            <li key={p.risorsaId}>
                                <strong>{nomeRisorsa(p.risorsaId)}</strong>
                                <ModificaQuantita
                                    attuale={attualeDi(p.risorsaId)}
                                    disabilitato={occupato}
                                    onApplica={modificaQuantita(p.risorsaId)}
                                />
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
                        ))}
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
                                        <span className="eco-sotto">
                                            {f.passiva ? "passiva" : "attiva"} · produce {f.prodotti.map((p) => nomeRisorsa(p.risorsaId)).join(", ") || "—"}
                                        </span>
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

                            <div>
                                <span className="eco-etichetta">Tipo di farm</span>
                                <div className="eco-modi" role="group" aria-label="Tipo di farm">
                                    <button type="button" className={!bozza.passiva ? "is-attivo" : ""} aria-pressed={!bozza.passiva} onClick={() => setBozza({ ...bozza, passiva: false })}>
                                        Attiva
                                    </button>
                                    <button type="button" className={bozza.passiva ? "is-attivo" : ""} aria-pressed={bozza.passiva} onClick={() => setBozza({ ...bozza, passiva: true })}>
                                        Passiva
                                    </button>
                                </div>
                                <small className="eco-anteprima">
                                    {bozza.passiva
                                        ? "Produce da sola, senza che il giocatore faccia nulla."
                                        : "Serve il giocatore: ogni produzione richiede un utilizzo."}
                                </small>
                            </div>

                            <label>{bozza.passiva ? "Ogni quanto completa un ciclo" : "Quanto dura un utilizzo"}
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

                            <h3>{bozza.passiva ? "Cosa produce a ogni ciclo" : "Cosa produce a ogni utilizzo"}</h3>
                            <ListaVoci
                                voci={bozza.prodotti}
                                setVoci={(v) => setBozza({ ...bozza, prodotti: v })}
                                risorse={risorse}
                                aggiungi="+ Aggiungi prodotto"
                                minimo={1}
                            />

                            <h3>{bozza.passiva ? "Costi a ogni ciclo" : "Costi a ogni utilizzo"}</h3>
                            <p className="eco-sotto">Lascia vuoto se la farm non costa nulla.</p>
                            <ListaVoci
                                voci={bozza.costi}
                                setVoci={(v) => setBozza({ ...bozza, costi: v })}
                                risorse={risorse}
                                aggiungi="+ Aggiungi costo"
                            />

                            <div className="eco-form-riga">
                                <button
                                    className="admin-user-save-btn"
                                    disabled={
                                        occupato || !bozza.nome.trim() ||
                                        vociValide(bozza.prodotti).length === 0 ||
                                        !(Number(bozza.tempoValore.replace(",", ".")) > 0)
                                    }
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
        </section>
    );
}
