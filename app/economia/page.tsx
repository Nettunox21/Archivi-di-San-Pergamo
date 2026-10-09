import Image from "next/image";
import Link from "next/link";
import {
    caricaEconomia, calcolaFarm, fazioniEcon, mappaValori,
    patrimonioFazione, patrimonioMondiale,
} from "@/lib/economia";
import { elencoDocumenti } from "@/lib/economiaDocs";
import { formatPercento, inParole, percento, raggruppa, formatEuro } from "@/lib/numeri";
import { Barre, Euro, Torta, type Fetta } from "@/app/components/EconomiaCharts";

export const dynamic = "force-dynamic";

export default async function EconomiaPage() {
    const dati = await caricaEconomia();
    const valori = mappaValori(dati.risorse);
    const titoliDoc = new Map(elencoDocumenti().map((d) => [d.slug, d.title]));

    const righe = fazioniEcon
        .map((f) => ({ f, patrimonio: patrimonioFazione(f.id, dati) }))
        .sort((a, b) => (a.patrimonio < b.patrimonio ? 1 : a.patrimonio > b.patrimonio ? -1 : 0));
    const mondiale = patrimonioMondiale(dati);

    const perFazione: Fetta[] = righe.map((r) => ({ etichetta: r.f.name, valore: r.patrimonio, href: `/economia/${r.f.id}` }));

    const perRisorsa: Fetta[] = dati.risorse
        .map((r) => ({
            etichetta: r.nome,
            valore: dati.possedimenti.filter((p) => p.risorsaId === r.id).reduce((s, p) => s + p.quantita * r.valore, 0n),
        }))
        .filter((x) => x.valore > 0n)
        .sort((a, b) => (a.valore < b.valore ? 1 : a.valore > b.valore ? -1 : 0))
        .slice(0, 6);

    const nomeFazione = (id: string) => fazioniEcon.find((f) => f.id === id)?.name ?? id;

    const farmMigliori = dati.farm
        .map((f) => ({ f, c: calcolaFarm(f, valori) }))
        .filter((x) => x.c.profittoOra > 0n)
        .sort((a, b) => (a.c.profittoOra < b.c.profittoOra ? 1 : -1))
        .slice(0, 5);

    return (
        <div className="eco-pagina">
            <header className="eco-testata">
                <div>
                    <h1>Economia del mondo</h1>
                    <p className="eco-sotto">Bilancio generale delle fazioni, aggiornato dai loro sovrani.</p>
                </div>
                <dl className="eco-totale">
                    <dt>Patrimonio mondiale</dt>
                    <dd className="eco-totale-num" title={formatEuro(mondiale)}>
                        {inParole(mondiale)} <span>€</span>
                    </dd>
                    <dd className="eco-totale-esatto">{raggruppa(mondiale)} €</dd>
                </dl>
            </header>

            {dati.errore && (
                <div className="eco-avviso">
                    <strong>L&apos;economia non è ancora attiva.</strong> {dati.errore}
                </div>
            )}

            <section className="eco-fatti">
                <div><b>{fazioniEcon.length}</b><span>fazioni</span></div>
                <div><b>{dati.risorse.length}</b><span>risorse in catalogo</span></div>
                <div><b>{dati.farm.length}</b><span>farm registrate</span></div>
                <div><b>{dati.scambi.length}</b><span>scambi registrati</span></div>
            </section>

            <div className="eco-griglia-2">
                <section className="eco-box">
                    <h2>Classifica per patrimonio</h2>
                    <Barre dati={perFazione} />
                </section>
                <section className="eco-box">
                    <h2>Come si divide la ricchezza</h2>
                    <Torta dati={perFazione} titolo="Patrimonio per fazione" />
                </section>
            </div>

            <div className="eco-griglia-2">
                <section className="eco-box">
                    <h2>Risorse che pesano di più</h2>
                    <Barre dati={perRisorsa} />
                </section>
                <section className="eco-box">
                    <h2>Farm più redditizie</h2>
                    {farmMigliori.length === 0 ? (
                        <p className="eco-vuoto">Nessuna farm in profitto.</p>
                    ) : (
                        <ol className="eco-elenco">
                            {farmMigliori.map(({ f, c }) => (
                                <li key={f.id}>
                                    <Link href={`/economia/${f.fazione}`}>{f.nome}</Link>
                                    <small>{nomeFazione(f.fazione)}</small>
                                    <span>
                                        <Euro v={c.profittoOra} segno /> / ora
                                    </span>
                                </li>
                            ))}
                        </ol>
                    )}
                </section>
            </div>

            <section className="eco-box">
                <h2>Ultimi scambi</h2>
                {dati.scambi.length === 0 ? (
                    <p className="eco-vuoto">Nessuno scambio registrato.</p>
                ) : (
                    <ul className="eco-scambi">
                        {dati.scambi.slice(0, 6).map((s) => (
                            <li key={s.id}>
                                <div className="eco-scambio-testa">
                                    <Link href={`/economia/${s.fazioneA}`}>{nomeFazione(s.fazioneA)}</Link>
                                    <span aria-hidden>⇄</span>
                                    <Link href={`/economia/${s.fazioneB}`}>{nomeFazione(s.fazioneB)}</Link>
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
                        ))}
                    </ul>
                )}
            </section>

            <h2 className="eco-titolo-sez">Le fazioni</h2>
            <div className="eco-fazioni">
                {righe.map((r, i) => (
                    <Link key={r.f.id} href={`/economia/${r.f.id}`} className="eco-fazione">
                        <div className="eco-fazione-banner">
                            <Image src={r.f.banner} alt={`Bandiera ${r.f.name}`} fill style={{ objectFit: "cover" }} />
                            <div className="eco-fazione-velo" />
                            <span className="eco-fazione-pos">{i + 1}°</span>
                        </div>
                        <div className="eco-fazione-corpo">
                            <h3>{r.f.name}</h3>
                            <p title={formatEuro(r.patrimonio)}><Euro v={r.patrimonio} /></p>
                            <small>{formatPercento(percento(r.patrimonio, mondiale))} del patrimonio mondiale</small>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
