import Link from "next/link";
import { eurInParole, formatEuro, formatPercento, formatTempo, inParole, percento, raggruppa } from "@/lib/numeri";

/* Grafici in SVG/CSS puro, calcolati sul server: nessuna libreria. */

export const PALETTE = [
    "#c8a96e", "#a8523f", "#6f8f72", "#5d7a99", "#b08aa8",
    "#d0864a", "#8a8f4e", "#7c6a54", "#4f8b8b", "#c0715a",
];

export type Fetta = { etichetta: string; valore: bigint; href?: string; nota?: string };

/** Valore in euro a parole, con il numero esatto al passaggio del mouse. */
export function Euro({ v, segno = false }: { v: bigint; segno?: boolean }) {
    const classe = segno ? (v > 0n ? "eco-pos" : v < 0n ? "eco-neg" : "") : "";
    return (
        <span className={classe} title={formatEuro(v)}>
            {segno && v > 0n ? "+" : ""}
            {eurInParole(v)}
        </span>
    );
}

/** Quantità a parole, con il numero esatto al passaggio del mouse. */
export function Quantita({ v }: { v: bigint }) {
    return <span title={raggruppa(v)}>{inParole(v)}</span>;
}

/** Tiene le prime `max` fette e somma il resto in "Altre". */
export function accorpa(fette: Fetta[], max = 8): Fetta[] {
    const ord = [...fette].filter((f) => f.valore > 0n).sort((a, b) => (a.valore < b.valore ? 1 : a.valore > b.valore ? -1 : 0));
    if (ord.length <= max) return ord;
    const testa = ord.slice(0, max - 1);
    const resto = ord.slice(max - 1).reduce((s, f) => s + f.valore, 0n);
    return [...testa, { etichetta: "Altre", valore: resto }];
}

function arco(cx: number, cy: number, r: number, a0: number, a1: number) {
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${cx} ${cy} L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${r} ${r} 0 ${grande} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
}

export function Torta({ dati, titolo }: { dati: Fetta[]; titolo: string }) {
    const fette = accorpa(dati);
    const totale = fette.reduce((s, f) => s + f.valore, 0n);
    if (totale === 0n) return <p className="eco-vuoto">Nessun dato da mostrare.</p>;

    let angolo = -Math.PI / 2;
    const parti = fette.map((f, i) => {
        const quota = percento(f.valore, totale);
        const a0 = angolo;
        angolo += (quota / 100) * Math.PI * 2;
        return { ...f, quota, a0, a1: angolo, colore: PALETTE[i % PALETTE.length] };
    });

    return (
        <div className="eco-torta" role="img" aria-label={titolo}>
            <svg viewBox="0 0 120 120" className="eco-torta-svg">
                {parti.length === 1 ? (
                    <circle cx="60" cy="60" r="56" fill={parti[0].colore} />
                ) : (
                    parti.map((p) => <path key={p.etichetta} d={arco(60, 60, 56, p.a0, p.a1)} fill={p.colore} stroke="#151311" strokeWidth="0.8" />)
                )}
                <circle cx="60" cy="60" r="22" fill="#151311" />
            </svg>
            <ul className="eco-legenda">
                {parti.map((p) => (
                    <li key={p.etichetta}>
                        <i style={{ background: p.colore }} />
                        <span className="eco-legenda-nome">
                            {p.href ? <Link href={p.href}>{p.etichetta}</Link> : p.etichetta}
                        </span>
                        <span className="eco-legenda-val" title={formatEuro(p.valore)}>
                            {formatPercento(p.quota)} · {eurInParole(p.valore)}
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function Barre({ dati }: { dati: Fetta[] }) {
    const max = dati.reduce((m, f) => (f.valore > m ? f.valore : m), 0n);
    if (dati.length === 0 || max === 0n) return <p className="eco-vuoto">Nessun dato da mostrare.</p>;
    return (
        <ol className="eco-barre">
            {dati.map((f, i) => (
                <li key={f.etichetta + i}>
                    <span className="eco-barre-nome">
                        {f.href ? <Link href={f.href}>{f.etichetta}</Link> : f.etichetta}
                    </span>
                    <span className="eco-barre-pista">
                        <span
                            className="eco-barre-riempi"
                            style={{ width: `${Math.max(percento(f.valore, max), 0.8)}%`, background: PALETTE[i % PALETTE.length] }}
                        />
                    </span>
                    <span className="eco-barre-val" title={formatEuro(f.valore)}>
                        {eurInParole(f.valore)}
                        {f.nota ? <small> {f.nota}</small> : null}
                    </span>
                </li>
            ))}
        </ol>
    );
}

/** Ricavo e costo della farm a 1, 2, 3 utilizzi (unico grafico temporale del sito). */
export function GraficoFarm({
    ricavo, costo, tempoSecondi, utilizzi = 3,
}: { ricavo: bigint; costo: bigint; tempoSecondi: number; utilizzi?: number }) {
    const W = 300, H = 130, base = 112, alto = 14;
    const maxVal = (ricavo > costo ? ricavo : costo) * BigInt(utilizzi);
    const h = (v: bigint) => (maxVal === 0n ? 0 : (Number((v * 10000n) / maxVal) / 10000) * (base - alto));
    const passo = W / utilizzi;
    const larg = Math.min(34, passo / 3);

    return (
        <div className="eco-farm-grafico">
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Ricavo e costo a 1, 2 e 3 utilizzi">
                <line x1="0" y1={base} x2={W} y2={base} stroke="rgba(200,169,110,0.35)" />
                {Array.from({ length: utilizzi }, (_, i) => {
                    const n = BigInt(i + 1);
                    const cx = passo * i + passo / 2;
                    const hr = h(ricavo * n), hc = h(costo * n);
                    return (
                        <g key={i}>
                            <rect x={cx - larg - 2} y={base - hr} width={larg} height={hr} fill={PALETTE[0]}>
                                <title>{`Ricavo: ${formatEuro(ricavo * n)}`}</title>
                            </rect>
                            <rect x={cx + 2} y={base - hc} width={larg} height={hc} fill={PALETTE[1]}>
                                <title>{`Costo: ${formatEuro(costo * n)}`}</title>
                            </rect>
                            <text x={cx} y={base + 13} textAnchor="middle" className="eco-svg-t">{i + 1}×</text>
                            <text x={cx} y={base + 24} textAnchor="middle" className="eco-svg-t eco-svg-t2">{formatTempo(tempoSecondi * (i + 1))}</text>
                        </g>
                    );
                })}
            </svg>
            <p className="eco-farm-leg">
                <i style={{ background: PALETTE[0] }} /> ricavo <i style={{ background: PALETTE[1] }} /> costo
            </p>
            <table className="eco-mini">
                <tbody>
                    {Array.from({ length: utilizzi }, (_, i) => {
                        const n = BigInt(i + 1);
                        return (
                            <tr key={i}>
                                <th>{i + 1}×</th>
                                <td><Euro v={ricavo * n} /></td>
                                <td><Euro v={costo * n} /></td>
                                <td><Euro v={(ricavo - costo) * n} segno /></td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
