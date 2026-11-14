import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db } from "@/lib/db";
import { inviaAi, pushConfigurato } from "@/lib/push";
import type { Sottoscrizione } from "@/lib/webpush";
import { getAzienda } from "@/lib/talanton";
import { getConfigCarote, prezzoSmeraldi } from "@/lib/carote-doro";
import { intero, leggiJson, risposta, rispostaErrore } from "@/lib/api";

/*  Richiesta di consegna a domicilio.
 *  Notifica al titolare (campo "titolare" di content/talanton/carote-doro.md)
 *  e a tutti gli admin:
 *    Titolo:      Ordine a domicilio
 *    Descrizione: <utente> · <N> carote d'oro (<M> smeraldi) · <note>
 *  Il messaggio non viene memorizzato. */

const USERNAME_SICURO = /^[A-Za-z0-9_.-]{1,64}$/;
const MAX_CAROTE = 10000;

// Anti-spam di base: una richiesta ogni 30 secondi per utente (vale per singola istanza del server).
const ULTIMA = new Map<string, number>();
const ATTESA_MS = 30_000;

export async function POST(req: NextRequest) {
    const utente = await getCurrentUser();
    if (!utente) return risposta("Devi accedere per richiedere un ordine", 401);

    const b = await leggiJson(req);
    const carote = intero(b?.carote);
    if (carote === null || carote > MAX_CAROTE) return risposta(`Inserisci una quantità tra 1 e ${MAX_CAROTE} carote`, 400);
    const note = b && typeof b.note === "string" ? b.note.trim().slice(0, 120) : "";
    if (b && b.note !== undefined && typeof b.note !== "string") return risposta("Note non valide", 400);

    const adesso = Date.now();
    if (adesso - (ULTIMA.get(utente.username) ?? 0) < ATTESA_MS) {
        return risposta("Hai già inviato una richiesta da poco: attendi qualche secondo", 429);
    }
    if (!pushConfigurato()) return risposta("Servizio di notifica non disponibile al momento. Contatta direttamente il titolare.", 503);

    try {
        const cfg = getConfigCarote();
        const smeraldi = prezzoSmeraldi(carote, cfg);
        const titolare = getAzienda("carote-doro")?.titolare ?? "";
        const admin = await db<{ username: string }[]>("/utenti?role=eq.admin&select=username");
        const destinatari = [...new Set([titolare, ...admin.map((a) => a.username)])].filter((n) => USERNAME_SICURO.test(n));
        if (destinatari.length === 0) return risposta("Nessun destinatario configurato", 500);

        ULTIMA.set(utente.username, adesso);

        const dispositivi = await db<Sottoscrizione[]>(
            `/push_sottoscrizioni?username=in.(${destinatari.map(encodeURIComponent).join(",")})&select=endpoint,p256dh,auth`
        );
        const parti = [utente.username, `${carote} carote d'oro (${smeraldi} smeraldi)`];
        if (note) parti.push(note);
        const esito = await inviaAi(dispositivi, { title: "Ordine a domicilio", body: parti.join(" · "), url: "/" });

        if (esito.inviati === 0) {
            ULTIMA.delete(utente.username);
            return risposta("Non è stato possibile avvisare il titolare. Contattalo direttamente.", 502);
        }
        return NextResponse.json({ ok: true, carote, smeraldi });
    } catch (e) {
        ULTIMA.delete(utente.username);
        return rispostaErrore(e);
    }
}
