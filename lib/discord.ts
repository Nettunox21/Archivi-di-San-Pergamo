// Pubblicazione facoltativa su un canale Discord tramite webhook.
// Si attiva solo se su Vercel esiste la variabile DISCORD_WEBHOOK_URL.

const PREFISSI = ["https://discord.com/api/webhooks/", "https://discordapp.com/api/webhooks/"];

export const discordAttivo = () => {
    const url = process.env.DISCORD_WEBHOOK_URL;
    return !!url && PREFISSI.some((p) => url.startsWith(p));
};

export async function pubblicaSuDiscord(titolo: string, testo: string, link?: string | null): Promise<boolean> {
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url || !PREFISSI.some((p) => url.startsWith(p))) return false;

    const descrizione = [testo, link ? `\n${link}` : ""].join("").trim().slice(0, 3800);
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: "Archivi di San Pergamo",
                // nessun @everyone / @here / ruolo può essere citato da un testo scritto qui
                allowed_mentions: { parse: [] },
                embeds: [{ title: titolo.slice(0, 250), description: descrizione, color: 0xc8a96e }],
            }),
        });
        return res.ok;
    } catch {
        return false;
    }
}
