import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db } from "@/lib/db";
import { inviaAi, pushConfigurato } from "@/lib/push";
import type { Sottoscrizione } from "@/lib/webpush";
import { getAzienda } from "@/lib/talanton";
import { getPianiSelezionabili } from "@/lib/trauma-team";
import { leggiJson, risposta, rispostaErrore } from "@/lib/api";

/*  Richiesta di abbonamento al Trauma Team.
 *  Il cliente (utente loggato) sceglie un piano: la notifica parte verso
 *  il titolare dell'azienda (campo "titolare" di content/talanton/trauma-team.md)
 *  e verso tutti gli utenti con ruolo admin.
 *    Titolo:      Nuovo Cliente <Piano>
 *    Descrizione: <nome utente del cliente>
 *  Il messaggio non viene memorizzato. */

const USERNAME_SICURO = /^[A-Za-z0-9_.-]{1,64}$/;

// Anti-spam di base: una richiesta al minuto per utente (vale per singola istanza del server).
const ULTIMA = new Map<string, number>();
const ATTESA_MS = 60_000;

export async function POST(req: NextRequest) {
    const utente = await getCurrentUser();
    if (!utente) return risposta("Devi accedere per attivare un abbonamento", 401);

    const b = await leggiJson(req);
    const nomePiano = b && typeof b.piano === "string" ? b.piano : "";
    // il piano deve esistere davvero nel file dei piani (e non essere un programma)
    const piano = getPianiSelezionabili().find((p) => p.nome === nomePiano);
    if (!piano) return risposta("Piano non valido", 400);

    const adesso = Date.now();
    const ultima = ULTIMA.get(utente.username) ?? 0;
    if (adesso - ultima < ATTESA_MS) return risposta("Hai già inviato una richiesta da poco: attendi un minuto", 429);

    if (!pushConfigurato()) return risposta("Servizio di notifica non disponibile al momento. Contatta direttamente il titolare.", 503);

    try {
        const titolare = getAzienda("trauma-team")?.titolare ?? "";
        const admin = await db<{ username: string }[]>("/utenti?role=eq.admin&select=username");
        const destinatari = [...new Set([titolare, ...admin.map((a) => a.username)])].filter((n) => USERNAME_SICURO.test(n));
        if (destinatari.length === 0) return risposta("Nessun destinatario configurato", 500);

        ULTIMA.set(utente.username, adesso);

        const dispositivi = await db<Sottoscrizione[]>(
            `/push_sottoscrizioni?username=in.(${destinatari.map(encodeURIComponent).join(",")})&select=endpoint,p256dh,auth`
        );
        const esito = await inviaAi(dispositivi, {
            title: `Nuovo Cliente ${piano.nome}`,
            body: utente.username,
            url: "/",
        });

        if (esito.inviati === 0) {
            ULTIMA.delete(utente.username);
            return risposta("Non è stato possibile avvisare il titolare. Contattalo direttamente.", 502);
        }
        return NextResponse.json({ ok: true });
    } catch (e) {
        ULTIMA.delete(utente.username);
        return rispostaErrore(e);
    }
}
