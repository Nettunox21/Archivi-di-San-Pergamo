import { redirect } from "next/navigation";
import { getCurrentUser } from "@/auth/users";
import AttivaNotifiche from "@/app/components/AttivaNotifiche";

export const dynamic = "force-dynamic";

export default async function NotifichePage() {
    const user = await getCurrentUser();
    if (!user) redirect("/login");

    return (
        <div className="notif-pagina">
            <header className="notif-testata">
                <div>
                    <h1>Notifiche</h1>
                    <p className="notif-sotto">Ricevi gli avvisi di San Pergamo direttamente sul telefono.</p>
                </div>
            </header>

            <AttivaNotifiche />

            <p className="notif-nota">
                Le notifiche vengono recapitate e basta: il sito non le conserva e non esiste uno storico. Se ne perdi una, non resta traccia da nessuna parte.
                L&apos;attivazione vale per questo dispositivo: su un altro telefono va fatta di nuovo.
            </p>
        </div>
    );
}
