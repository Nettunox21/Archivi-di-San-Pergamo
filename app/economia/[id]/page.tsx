import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/users";
import {
    caricaEconomia, calcolaFarm, fazioniEcon, mappaValori,
    patrimonioFazione, patrimonioMondiale, puoModificareDa, trovaFazione, type Ruolo,
} from "@/lib/economia";
import { elencoDocumenti } from "@/lib/economiaDocs";
import { formatEuro, formatPercento, formatTempo, percento } from "@/lib/numeri";
import { Euro, GraficoFarm, Quantita, Torta, type Fetta } from "@/app/components/EconomiaCharts";
import EconomiaEditor from "@/app/components/EconomiaEditor";
import { entiDellaFazione, normalizzaNome, type Ente } from "@/lib/enti";

export const dynamic = "force-dynamic";

function ElencoVoci({ voci, nomi }: { voci: { risorsaId: number; quantita: bigint }[]; nomi: Map<number, string> }) {
    return (
        <>
            {voci.map((x, i) => (
                <span key={x.risorsaId}>
                    {i > 0 ? ", " : ""}
                    <Quantita v={x.quantita} /> {nomi.get(x.risorsaId) ?? "?"}
                </span>
            ))}
        </>
    );
}

const ETICHETTA_RUOLO: Record<Ruolo, string> = { sovrano: "Sovrano", vice: "Vice", civile: "Civili" };

export default async function EconomiaFazionePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const fazione = trovaFazione(id);
    // gli istituti non hanno una economia propria: vivono dentro le nazioni collegate
    if (!fazione || fazione.tipo === "istituto") notFound();

    const [user, dati] = await Promise.all([getCurrentUser(), caricaEconomia()]);
    const valori = mappaValori(dati.risorse);
    const nomeRisorsa = new Map(dati.risorse.map((r) => [r.id, r.nome]));
    const nomeFazione = (x: string) => trovaFazione(x)?.name ?? x;
    const titoliDoc = new Map(elencoDocumenti().map((d) => [d.slug, d.title]));

    const miei = dati.possedimenti.filter((p) => p.fazione === id);
    const righe = miei
        .map((p) => {
            const unitario = valori.get(p.risorsaId) ?? 0n;
            return { ...p, nome: nomeRisorsa.get(p.risorsaId) ?? "?", unitario, totale: p.quantita * unitario };
        })
        .sort((a, b) => (a.totale < b.totale ? 1 : a.totale > b.totale ? -1 : 0));

    const patrimonio = patrimonioFazione(id, dati);
    const mondiale = patrimonioMondiale(dati);
    const classifica = fazioniEcon
        .map((f) => ({ id: f.id, p: patrimonioFazione(f.id, dati) }))
        .sort((a, b) => (a.p < b.p ? 1 : a.p > b.p ? -1 : 0));
    const posizione = classifica.findIndex((c) => c.id === id) + 1;
    const principale = righe[0];

    const fette: Fetta[] = righe.map((r) => ({ etichetta: r.nome, valore: r.totale }));

    const farm = dati.farm.filter((f) => f.fazione === id);
    const scambi = dati.scambi.filter((s) => s.fazioneA === id || s.fazioneB === id);
    const membri = dati.appartenenze.filter((a) => a.fazione === id);

    const puoModificare = puoModificareDa(user, id, dati.appartenenze);

    // enti (istituti e aziende) collegati a questa nazione: solo informativo, da content/fazioni/enti.md
    const enti = entiDellaFazione(id);
    const idRisorsaPerNome = new Map(dati.risorse.map((r) => [normalizzaNome(r.nome), r.id]));
    const quantitaPossedute = new Map(miei.map((p) => [p.risorsaId, p.quantita]));

    return (
        <div className="eco-pagina">
            <Link href="/economia" className="eco-indietro">← Economia del mondo</Link>

            <header className="eco-fz-testata">
                <div className="eco-fz-banner">
                    <Image src={fazione.banner} alt={`Bandiera ${fazione.name}`} fill style={{ objectFit: "cover" }} />
                    <div className="eco-fazione-velo" />
                </div>
                <div className="eco-fz-titolo">
                    <h1>{fazione.name}</h1>
                    <p className="eco-sotto">{fazione.description}</p>
                </div>
            </header>

            {dati.errore && (
                <div className="eco-avviso"><strong>L&apos;economia non è ancora attiva.</strong> {dati.errore}</div>
            )}

            <section className="eco-fatti eco-fatti-fz">
                <div>
                    <b title={formatEuro(patrimonio)}><Euro v={patrimonio} /></b>
                    <span>patrimonio totale</span>
                </div>
                <div><b>{posizione}° su {fazioniEcon.length}</b><span>posizione mondiale</span></div>
                <div><b>{formatPercento(percento(patrimonio, mondiale))}</b><span>del patrimonio mondiale</span></div>
                <div>
                    <b>{principale ? formatPercento(percento(principale.totale, patrimonio)) : "—"}</b>
                    <span>{principale ? `in ${principale.nome} (concentrazione)` : "concentrazione"}</span>
                </div>
            </section>

            <div className="eco-griglia-2">
                <section className="eco-box">
                    <h2>Composizione del patrimonio</h2>
                    <Torta dati={fette} titolo={`Patrimonio di ${fazione.name} per risorsa`} />
                </section>
                <section className="eco-box">
                    <h2>Chi governa</h2>
                    {membri.length === 0 ? (
                        <p className="eco-vuoto">Nessun membro assegnato.</p>
                    ) : (
                        <dl className="eco-membri">
                            {(["sovrano", "vice", "civile"] as Ruolo[]).map((r) => {
                                const lista = membri.filter((m) => m.ruolo === r);
                                if (lista.length === 0) return null;
                                return (
                                    <div key={r}>
                                        <dt>{ETICHETTA_RUOLO[r]}</dt>
                                        <dd>{lista.map((m) => m.username).join(", ")}</dd>
                                    </div>
                                );
                            })}
                        </dl>
                    )}
                </section>
            </div>

            {enti.length > 0 && (
                <section className="eco-box">
                    <h2>Enti collegati</h2>
                    <ul className="eco-enti">
                        {enti.map((e: Ente) => {
                            const altre = e.nazioni.filter((n) => n !== id);
                            return (
                                <li key={e.nome}>
                                    <div className="eco-ente-testa">
                                        <strong>{e.link ? <Link href={e.link}>{e.nome}</Link> : e.nome}</strong>
                                        <span className="eco-badge">{e.tipo === "istituto" ? "Istituto" : "Azienda"}</span>
                                        {e.profitto && <span className="eco-ente-profitto">Profitto: {e.profitto}</span>}
                                        {altre.length > 0 && <small>collegato anche a {altre.map(nomeFazione).join(", ")}</small>}
                                    </div>
                                    {e.descrizione && <p className="eco-ente-desc">{e.descrizione}</p>}
                                    <p className="eco-ente-risorse">
                                        {e.condivide.modo === "tutto" && <>Può attingere a tutto il magazzino di {fazione.name}.</>}
                                        {e.condivide.modo === "niente" && <>Non condivide risorse con la nazione.</>}
                                        {e.condivide.modo === "elenco" && (
                                            <>
                                                Condivide:{" "}
                                                {e.condivide.risorse.map((nome, i) => {
                                                    const rid = idRisorsaPerNome.get(normalizzaNome(nome));
                                                    const q = rid === undefined ? undefined : quantitaPossedute.get(rid);
                                                    return (
                                                        <span key={nome}>
                                                            {i > 0 ? ", " : ""}
                                                            {nome}
                                                            {rid === undefined ? " (non in catalogo)" : q !== undefined ? <> (<Quantita v={q} /> in magazzino)</> : " (non in magazzino)"}
                                                        </span>
                                                    );
                                                })}
                                                .
                                            </>
                                        )}
                                    </p>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section className="eco-box">
                <h2>Risorse</h2>
                {righe.length === 0 ? (
                    <p className="eco-vuoto">Questa fazione non possiede ancora risorse registrate.</p>
                ) : (
                    <div className="eco-tabella-scroll">
                        <table className="eco-tabella">
                            <thead>
                                <tr><th>Risorsa</th><th>Quantità</th><th>Valore unitario</th><th>Valore totale</th><th>Quota</th></tr>
                            </thead>
                            <tbody>
                                {righe.map((r) => (
                                    <tr key={r.risorsaId}>
                                        <td>{r.nome}</td>
                                        <td><Quantita v={r.quantita} /></td>
                                        <td><Euro v={r.unitario} /></td>
                                        <td><Euro v={r.totale} /></td>
                                        <td>{formatPercento(percento(r.totale, patrimonio))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="eco-box">
                <h2>Farm</h2>
                {farm.length === 0 ? (
                    <p className="eco-vuoto">Nessuna farm registrata.</p>
                ) : (
                    <div className="eco-farm-griglia">
                        {farm.map((f) => {
                            const c = calcolaFarm(f, valori);
                            return (
                                <article key={f.id} className="eco-farm">
                                    <h3>
                                        {f.nome} <span className={`eco-badge${f.passiva ? " eco-badge-passiva" : ""}`}>{f.passiva ? "Passiva" : "Attiva"}</span>
                                    </h3>
                                    {f.descrizione && <p className="eco-farm-desc">{f.descrizione}</p>}
                                    <p>
                                        {f.passiva ? "Produce da sola, ogni " : "A ogni utilizzo ("}
                                        <strong>{formatTempo(f.tempoSecondi)}</strong>
                                        {f.passiva ? ": " : ") produce: "}
                                        <ElencoVoci voci={f.prodotti} nomi={nomeRisorsa} />.
                                    </p>
                                    <p className="eco-farm-costi">
                                        Costo {f.passiva ? "a ogni ciclo" : "a ogni utilizzo"}:{" "}
                                        {f.costi.length === 0 ? "nessuno" : <ElencoVoci voci={f.costi} nomi={nomeRisorsa} />}
                                    </p>
                                    <p className="eco-farm-profitto">
                                        Profitto {f.passiva ? "a ogni ciclo" : "a ogni utilizzo"}: <Euro v={c.profitto} segno /> · all&apos;ora: <Euro v={c.profittoOra} segno />
                                        {f.passiva && <> · al giorno: <Euro v={c.profittoGiorno} segno /></>}
                                    </p>
                                    <GraficoFarm ricavo={c.ricavo} costo={c.costo} tempoSecondi={f.tempoSecondi} passiva={f.passiva} />
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="eco-box">
                <h2>Scambi</h2>
                {scambi.length === 0 ? (
                    <p className="eco-vuoto">Nessuno scambio registrato.</p>
                ) : (
                    <ul className="eco-scambi">
                        {scambi.map((s) => {
                            const altra = s.fazioneA === id ? s.fazioneB : s.fazioneA;
                            return (
                                <li key={s.id}>
                                    <div className="eco-scambio-testa">
                                        <span>con</span>
                                        {fazioniEcon.some((f) => f.id === altra) ? <Link href={`/economia/${altra}`}>{nomeFazione(altra)}</Link> : <span>{nomeFazione(altra)}</span>}
                                        <time>{new Date(s.creatoIl).toLocaleDateString("it-IT")}</time>
                                    </div>
                                    <p>{s.descrizione}</p>
                                    {s.documenti.length > 0 && (
                                        <p className="eco-doc-chips">
                                            {s.documenti.map((d) => (
                                                <Link key={d} href={`/documenti?doc=${d}`}>📜 {titoliDoc.get(d) ?? d}</Link>
                                            ))}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {puoModificare && (
                <EconomiaEditor
                    fazione={{ id, name: fazione.name }}
                    risorse={dati.risorse.map((r) => ({ id: r.id, nome: r.nome, valore: r.valore.toString() }))}
                    possedimenti={miei.map((p) => ({ risorsaId: p.risorsaId, quantita: p.quantita.toString() }))}
                    farm={farm.map((f) => ({
                        id: f.id,
                        nome: f.nome,
                        descrizione: f.descrizione,
                        passiva: f.passiva,
                        tempoSecondi: f.tempoSecondi,
                        prodotti: f.prodotti.map((c) => ({ risorsaId: c.risorsaId, quantita: c.quantita.toString() })),
                        costi: f.costi.map((c) => ({ risorsaId: c.risorsaId, quantita: c.quantita.toString() })),
                    }))}
                    scambi={scambi.map((s) => ({
                        id: s.id,
                        con: nomeFazione(s.fazioneA === id ? s.fazioneB : s.fazioneA),
                        descrizione: s.descrizione,
                        data: new Date(s.creatoIl).toLocaleDateString("it-IT"),
                    }))}
                    altreFazioni={fazioniEcon.filter((f) => f.id !== id).map((f) => ({ id: f.id, name: f.name }))}
                    documenti={elencoDocumenti()}
                />
            )}
        </div>
    );
}
