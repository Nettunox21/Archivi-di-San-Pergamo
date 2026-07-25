import Link from "next/link";
import { getDocuments } from "@/lib/documents";
import DocumentiClient from "@/app/components/DocumentiClient";

export default function DocumentiPage() {
    const documents = getDocuments();

    return (
        <div className="documenti-page">
            <header className="documenti-hero">
                <h1>Documenti</h1>
                <p className="wiki-subtitle">
                    Archivio dei documenti ufficiali dell'Ordine
                </p>
                <Link href="/documenti/help" className="btn">
                    Raccolte
                </Link>
            </header>

            <DocumentiClient documents={documents} />
        </div>
    );
}
