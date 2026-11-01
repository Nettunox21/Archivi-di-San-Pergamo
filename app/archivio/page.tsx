import Link from "next/link";
import { getSlugVisibili } from "@/lib/accesso";

export default async function ArchivioPage() {
    const pages = await getSlugVisibili();

    return (
        <div className="wiki-container">
            <h1>Archivio</h1>

            <ul>
                {pages.map(slug => (
                    <li key={slug}>
                        <Link href={`/archivio/${slug}`}>
                            {slug}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}
