import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { db, eq } from "@/lib/db";
import { trovaFazione } from "@/lib/economia";
import { inviaAi, pushConfigurato, trovaDispositivi, type Destinatari } from "@/lib/push";
import { leggiJson, risposta, rispostaErrore, testo } from "@/lib/api";

async function soloAdmin() {
    const u = await getCurrentUser();
    return u && u.role === "admin" ? u : null;
}

// Stato: configurazione presente e quanti dispositivi sono iscritti.
export async function GET() {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    try {
        const righe = await db<{ username: string }[]>("/push_sottoscrizioni?select=username");
        return NextResponse.json({
            configurato: pushConfigurato(),
            dispositivi: righe.length,
            utenti: new Set(righe.map((r) => r.username)).size,
        });
    } catch (e) {
        return rispostaErrore(e);
    }
}

// Invia la notifica. Il messaggio NON viene salvato: si risponde solo con il riepilogo dell'invio.
export async function POST(req: NextRequest) {
    if (!(await soloAdmin())) return risposta("Non autorizzato", 403);
    if (!pushConfigurato()) return risposta("Notifiche non configurate: mancano le chiavi su Vercel", 503);

    const b = await leggiJson(req);
    if (!b) return risposta("Richiesta non valida", 400);

    const titolo = testo(b.titolo, 80);
    if (!titolo) return risposta("Titolo mancante (max 80 caratteri)", 400);
    const corpo = typeof b.testo === "string" ? b.testo.trim() : "";
    if (corpo.length > 300) return risposta("Testo troppo lungo (max 300 caratteri)", 400);

    // solo percorsi interni del sito, mai indirizzi esterni
    let url = "/";
    if (typeof b.link === "string" && b.link.trim()) {
        const l = b.link.trim();
        if (!/^\/[^/\\]/.test(l) || l.length > 200) return risposta("Il link deve essere un percorso del sito, es. /documenti", 400);
        url = l;
    }

    let dest: Destinatari;
    if (b.destTipo === "tutti") dest = { tipo: "tutti" };
    else if (b.destTipo === "fazione") {
        const f = typeof b.destValore === "string" ? b.destValore : "";
        if (!trovaFazione(f)) return risposta("Fazione non valida", 400);
        dest = { tipo: "fazione", valore: f };
    } else if (b.destTipo === "utente") {
        const u = typeof b.destValore === "string" ? b.destValore : "";
        try {
            const esiste = await db<{ username: string }[]>(`/utenti?username=${eq(u)}&select=username`);
            if (!esiste?.[0]) return risposta("Utente non trovato", 400);
        } catch (e) {
            return rispostaErrore(e);
        }
        dest = { tipo: "utente", valore: u };
    } else return risposta("Destinatari non validi", 400);

    try {
        const dispositivi = await trovaDispositivi(dest);
        const riepilogo = await inviaAi(dispositivi, { title: titolo, body: corpo, url });
        return NextResponse.json(riepilogo);
    } catch (e) {
        return rispostaErrore(e);
    }
}
