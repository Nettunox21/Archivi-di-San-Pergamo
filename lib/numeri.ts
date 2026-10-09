// Numeri enormi (triliardi e oltre): tutto in BigInt, salvato come testo di sole cifre.
// Scala lunga italiana: miliardo = 10^9, bilione = 10^12, biliardo = 10^15,
// trilione = 10^18, triliardo = 10^21, quadrilione = 10^24 ...

export const MAX_CIFRE = 30;

/** Legge "3.000.000", "3 000 000" o "3000000". Restituisce null se non valido. */
export function parseNumero(input: unknown): bigint | null {
    if (typeof input === "bigint") return input >= 0n ? input : null;
    if (typeof input !== "string") return null;
    const pulito = input.replace(/[.\s']/g, "");
    if (!new RegExp(`^\\d{1,${MAX_CIFRE}}$`).test(pulito)) return null;
    return BigInt(pulito);
}

/** Per i valori letti dal database (testo di cifre). Se corrotto torna 0. */
export function daTesto(s: unknown): bigint {
    return parseNumero(typeof s === "string" ? s : String(s ?? "")) ?? 0n;
}

/** 1234567 -> "1.234.567" */
export function raggruppa(n: bigint): string {
    const neg = n < 0n;
    const s = (neg ? -n : n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return neg ? `−${s}` : s;
}

export const formatEuro = (n: bigint) => `${raggruppa(n)} €`;

const UNITA: [bigint, string, string][] = [
    [10n ** 6n, "milione", "milioni"],
    [10n ** 9n, "miliardo", "miliardi"],
    [10n ** 12n, "bilione", "bilioni"],
    [10n ** 15n, "biliardo", "biliardi"],
    [10n ** 18n, "trilione", "trilioni"],
    [10n ** 21n, "triliardo", "triliardi"],
    [10n ** 24n, "quadrilione", "quadrilioni"],
    [10n ** 27n, "quadriliardo", "quadriliardi"],
    [10n ** 30n, "quintilione", "quintilioni"],
    [10n ** 33n, "quintiliardo", "quintiliardi"],
];

/** Forma compatta a parole: 3250000000000000000000 -> "3,25 triliardi". Sotto il milione resta in cifre. */
export function inParole(n: bigint): string {
    const neg = n < 0n;
    const a = neg ? -n : n;
    let u: [bigint, string, string] | null = null;
    for (const x of UNITA) if (a >= x[0]) u = x;
    const segno = neg ? "−" : "";
    if (!u) return segno + raggruppa(a);

    const intero = a / u[0];
    const dec = ((a % u[0]) * 100n) / u[0]; // due decimali, troncati
    let num = raggruppa(intero);
    if (dec !== 0n) num += "," + dec.toString().padStart(2, "0").replace(/0$/, "");
    const nome = intero === 1n && dec === 0n ? u[1] : u[2];
    return `${segno}${num} ${nome}`;
}

export const eurInParole = (n: bigint) => `${inParole(n)} €`;

/** Quota percentuale con due decimali (numero normale, solo per grafici e testo). */
export function percento(parte: bigint, totale: bigint): number {
    if (totale <= 0n || parte <= 0n) return 0;
    return Number((parte * 10000n) / totale) / 100;
}

export function formatPercento(p: number): string {
    return `${p.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
}

/** 5400 -> "1 h 30 min" */
export function formatTempo(secondi: number): string {
    let s = Math.max(0, Math.round(secondi));
    const g = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    const parti: string[] = [];
    if (g) parti.push(`${g} g`);
    if (h) parti.push(`${h} h`);
    if (m) parti.push(`${m} min`);
    if (s || parti.length === 0) parti.push(`${s} s`);
    return parti.join(" ");
}
