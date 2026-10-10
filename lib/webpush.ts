// Web Push senza librerie esterne: cifratura RFC 8291 (aes128gcm) e firma VAPID RFC 8292 (ES256),
// solo con il modulo "crypto" già incluso in Node.
import { createECDH, createPrivateKey, hkdfSync, randomBytes, createCipheriv, sign } from "crypto";

const b64u = (b: Buffer | Uint8Array) => Buffer.from(b).toString("base64url");
const daB64u = (s: string) => Buffer.from(s, "base64url");

/* ---------- Chiavi VAPID ---------- */

export type ChiaviVapid = { pubblica: string; privata: string };

export function generaChiaviVapid(): ChiaviVapid {
    const ecdh = createECDH("prime256v1");
    ecdh.generateKeys();
    const privata = Buffer.alloc(32);
    ecdh.getPrivateKey().copy(privata, 32 - ecdh.getPrivateKey().length);
    return { pubblica: b64u(ecdh.getPublicKey()), privata: b64u(privata) };
}

/** Ripulisce un valore incollato su Vercel: spazi, virgolette e il prefisso "NOME=" copiato per errore. */
export function pulisciEnv(valore: string | undefined, nome: string): string {
    let v = (valore ?? "").trim();
    if (v.toUpperCase().startsWith(`${nome}=`)) v = v.slice(nome.length + 1).trim();
    return v.replace(/^["'`]+|["'`]+$/g, "").trim();
}

const SOGGETTO_PREDEFINITO = "https://archivi-di-san-pergamo.vercel.app";

export type DiagnosiVapid = { valida: boolean; problemi: string[]; avvisi: string[] };

/** Controlla le tre variabili di Vercel e spiega, in italiano, cosa non va. */
export function diagnosiVapid(): DiagnosiVapid {
    const problemi: string[] = [];
    const avvisi: string[] = [];
    const pub = pulisciEnv(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
    const priv = pulisciEnv(process.env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");

    if (!pub) problemi.push("Manca la variabile VAPID_PUBLIC_KEY su Vercel.");
    if (!priv) problemi.push("Manca la variabile VAPID_PRIVATE_KEY su Vercel.");

    const bytesPub = pub ? daB64u(pub) : Buffer.alloc(0);
    const bytesPriv = priv ? daB64u(priv) : Buffer.alloc(0);

    if (pub && !(bytesPub.length === 65 && bytesPub[0] === 4)) {
        problemi.push(
            bytesPub.length === 32
                ? "VAPID_PUBLIC_KEY contiene una chiave di 32 byte: sembra la chiave PRIVATA. Probabilmente le due chiavi sono state scambiate."
                : `VAPID_PUBLIC_KEY non è valida (${pub.length} caratteri, ne servono 87): ricopiala per intero, senza spazi.`
        );
    }
    if (priv && bytesPriv.length !== 32) {
        problemi.push(
            bytesPriv.length === 65
                ? "VAPID_PRIVATE_KEY contiene una chiave di 65 byte: sembra la chiave PUBBLICA. Probabilmente le due chiavi sono state scambiate."
                : `VAPID_PRIVATE_KEY non è valida (${priv.length} caratteri, ne servono 43): ricopiala per intero, senza spazi.`
        );
    }

    if (problemi.length === 0) {
        try {
            const e = createECDH("prime256v1");
            e.setPrivateKey(bytesPriv);
            if (!e.getPublicKey().equals(bytesPub)) {
                problemi.push("VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY non sono una coppia: vanno copiate dalla stessa generazione di chiavi.");
            }
        } catch {
            problemi.push("VAPID_PRIVATE_KEY non è una chiave valida.");
        }
    }

    const sub = pulisciEnv(process.env.VAPID_SUBJECT, "VAPID_SUBJECT");
    if (sub && !soggettoValido(sub)) {
        avvisi.push("VAPID_SUBJECT non è valido (serve mailto:tua@email.it, senza segnaposto): uso al suo posto l'indirizzo del sito.");
    }
    return { valida: problemi.length === 0, problemi, avvisi };
}

function soggettoValido(s: string): boolean {
    if (/TUA-EMAIL|esempio\.it|example\./i.test(s)) return false;
    return /^mailto:[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) || /^https:\/\/[^\s/]+/.test(s);
}

export function configVapid(): (ChiaviVapid & { soggetto: string }) | null {
    if (!diagnosiVapid().valida) return null;
    const pubblica = pulisciEnv(process.env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
    const privata = pulisciEnv(process.env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
    const sub = pulisciEnv(process.env.VAPID_SUBJECT, "VAPID_SUBJECT");
    const soggetto = soggettoValido(sub) ? sub : SOGGETTO_PREDEFINITO;
    return { pubblica, privata, soggetto };
}

/** JWT firmato ES256 che dimostra al servizio push che il messaggio arriva dal nostro sito. */
export function firmaVapid(endpoint: string, c: ChiaviVapid & { soggetto: string }, ora = Date.now()): string {
    const aud = new URL(endpoint).origin;
    const intestazione = b64u(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
    const corpo = b64u(Buffer.from(JSON.stringify({ aud, exp: Math.floor(ora / 1000) + 12 * 3600, sub: c.soggetto })));
    const dati = `${intestazione}.${corpo}`;

    const pub = daB64u(c.pubblica);
    const chiave = createPrivateKey({
        format: "jwk",
        key: { kty: "EC", crv: "P-256", d: c.privata, x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)) },
    });
    const firma = sign("sha256", Buffer.from(dati), { key: chiave, dsaEncoding: "ieee-p1363" });
    return `${dati}.${b64u(firma)}`;
}

/* ---------- Cifratura del messaggio ---------- */

/** Cifra il messaggio per un dispositivo. `test` serve solo a riprodurre i vettori ufficiali della specifica. */
export function cifra(
    messaggio: Buffer,
    p256dh: string,
    auth: string,
    test?: { privataEfimera: Buffer; salt: Buffer }
): Buffer {
    const uaPubblica = daB64u(p256dh);
    const segreto = daB64u(auth);

    const efimera = createECDH("prime256v1");
    if (test) efimera.setPrivateKey(test.privataEfimera);
    else efimera.generateKeys();
    const asPubblica = efimera.getPublicKey();
    const ecdh = efimera.computeSecret(uaPubblica);

    const salt = test ? test.salt : randomBytes(16);

    const infoChiave = Buffer.concat([Buffer.from("WebPush: info\0"), uaPubblica, asPubblica]);
    const ikm = Buffer.from(hkdfSync("sha256", ecdh, segreto, infoChiave, 32));
    const cek = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: aes128gcm\0"), 16));
    const nonce = Buffer.from(hkdfSync("sha256", ikm, salt, Buffer.from("Content-Encoding: nonce\0"), 12));

    const cifrario = createCipheriv("aes-128-gcm", cek, nonce);
    // 0x02 = ultimo (e unico) blocco del messaggio
    const cifrato = Buffer.concat([cifrario.update(Buffer.concat([messaggio, Buffer.from([2])])), cifrario.final(), cifrario.getAuthTag()]);

    const rs = Buffer.alloc(4);
    rs.writeUInt32BE(4096);
    return Buffer.concat([salt, rs, Buffer.from([asPubblica.length]), asPubblica, cifrato]);
}

/* ---------- Invio ---------- */

export type Sottoscrizione = { endpoint: string; p256dh: string; auth: string };
export type Esito = "ok" | "scaduta" | "errore";

/** Il servizio push è raggiungibile solo se l'indirizzo è di uno dei servizi push noti (niente richieste a indirizzi arbitrari). */
export function endpointAmmesso(endpoint: string): boolean {
    try {
        const u = new URL(endpoint);
        if (u.protocol !== "https:" || endpoint.length > 600) return false;
        const h = u.hostname;
        return (
            h === "fcm.googleapis.com" ||
            h.endsWith(".push.services.mozilla.com") || h === "updates.push.services.mozilla.com" ||
            h.endsWith(".push.apple.com") ||
            h.endsWith(".notify.windows.com")
        );
    } catch {
        return false;
    }
}

export async function inviaPush(
    sub: Sottoscrizione,
    messaggio: { title: string; body: string; url: string },
    cfg: ChiaviVapid & { soggetto: string }
): Promise<Esito> {
    try {
        const corpo = cifra(Buffer.from(JSON.stringify(messaggio)), sub.p256dh, sub.auth);
        const res = await fetch(sub.endpoint, {
            method: "POST",
            headers: {
                Authorization: `vapid t=${firmaVapid(sub.endpoint, cfg)}, k=${cfg.pubblica}`,
                "Content-Encoding": "aes128gcm",
                "Content-Type": "application/octet-stream",
                TTL: "86400",
                Urgency: "high",
            },
            body: new Uint8Array(corpo),
            signal: AbortSignal.timeout(8000),
        });
        if (res.status >= 200 && res.status < 300) return "ok";
        if (res.status === 404 || res.status === 410) return "scaduta";
        return "errore";
    } catch {
        return "errore";
    }
}
