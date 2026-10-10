import Link from "next/link";

/** Campanella che porta alla pagina dove attivare le notifiche sul telefono. */
export default function NotificheBell({ className = "" }: { className?: string }) {
    return (
        <Link href="/notifiche" className={`notif-bell ${className}`} aria-label="Notifiche sul telefono" title="Notifiche">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
                <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
        </Link>
    );
}
