import { NextResponse } from "next/server";
import { getCurrentUser } from "@/auth/users";
import { inviaAi, pushConfigurato, trovaDispositivi } from "@/lib/push";
import { risposta, rispostaErrore } from "@/lib/api";

// Notifica di prova inviata solo ai dispositivi dell'utente che la chiede.
export async function POST() {
    const user = await getCurrentUser();
    if (!user) return risposta("Devi accedere", 401);
    if (!pushConfigurato()) return risposta("Le notifiche non sono ancora attive: manca la configurazione", 503);

    try {
        const dispositivi = await trovaDispositivi({ tipo: "utente", valore: user.username });
        if (dispositivi.length === 0) return risposta("Nessun dispositivo iscritto: attiva prima le notifiche", 404);
        const r = await inviaAi(dispositivi, {
            title: "Notifica di prova",
            body: "Funziona! Riceverai qui gli avvisi di San Pergamo.",
            url: "/notifiche",
        });
        return NextResponse.json(r);
    } catch (e) {
        return rispostaErrore(e);
    }
}
