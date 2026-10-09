import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/users";
import {
    caricaEconomia, caricaRegistro, calcolaFarm, fazioniEcon, mappaValori,
    patrimonioFazione, patrimonioMondiale, puoModificareDa, trovaFazione, type Ruolo,
} from "@/lib/economia";
import { elencoDocumenti } from "@/lib/economiaDocs";
import { formatEuro, formatPercento, formatTempo, percento } from "@/lib/numeri";
import { Euro, GraficoFarm, Quantita, Torta, type Fetta } from "@/app/components/EconomiaCharts";
import EconomiaEditor from "@/app/components/EconomiaEditor";

export const dynamic = "force-dynamic";

const ETICHETTA_RUOLO: Record<Ruolo, string> = { sovrano: "Sovrano", vice: "Vice", civile: "Civili" };

export default async function EconomiaFazionePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const fazione = trovaFazione(id);
    if (!fazione) notFound();

    const [user, dati] = await Promise.all([getCurrentUser(), caricaEconomia()]);
    const valori = mappaValori(dati.risorse);
    const nomeRisorsa = new Map(dati.risorse.map((r) => [r.id, r.nome]));
    const nomeFazione = (x: string) => fazioniEcon.find((f) => f.id === x)?.name ?? x;
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
    const registro = puoModificare ? await caricaRegistro(id) : [];

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
                                    <h3>{f.nome}</h3>
                                    {f.descrizione && <p className="eco-farm-desc">{f.descrizione}</p>}
                                    <p>
                                        Produce <Quantita v={f.prodottoQuantita} /> {nomeRisorsa.get(f.prodottoId) ?? "?"} ogni{" "}
                                        <strong>{formatTempo(f.tempoSecondi)}</strong>.
                                    </p>
                                    <p className="eco-farm-costi">
                                        Costo per utilizzo:{" "}
                                        {f.costi.length === 0
                                            ? "nessuno"
                                            : f.costi.map((x, i) => (
                                                  <span key={x.risorsaId}>
                                                      {i > 0 ? ", " : ""}
                                                      <Quantita v={x.quantita} /> {nomeRisorsa.get(x.risorsaId) ?? "?"}
                                                  </span>
                                              ))}
                                    </p>
                                    <p className="eco-farm-profitto">
                                        Profitto per utilizzo: <Euro v={c.profitto} segno /> · all&apos;ora: <Euro v={c.profittoOra} segno />
                                    </p>
                                    <GraficoFarm ricavo={c.ricavo} costo={c.costo} tempoSecondi={f.tempoSecondi} />
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
                                        <Link href={`/economia/${altra}`}>{nomeFazione(altra)}</Link>
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
                        prodottoId: f.prodottoId,
                        prodottoQuantita: f.prodottoQuantita.toString(),
                        tempoSecondi: f.tempoSecondi,
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
                    registro={registro.map((v) => ({
                        id: v.id,
                        username: v.username,
                        azione: v.azione,
                        dettaglio: v.dettaglio,
                        quando: new Date(v.creatoIl).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }),
                    }))}
                />
            )}
        </div>
    );
}
