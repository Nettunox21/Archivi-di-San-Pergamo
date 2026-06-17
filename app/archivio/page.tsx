import fs from "fs";
import path from "path";
import Link from "next/link";

export default function ArchivioPage() {
    const dir = path.join(process.cwd(), "content/archivio");

    const files = fs.readdirSync(dir);

    const pages = files
        .filter(f => f.endsWith(".md"))
        .map(f => f.replace(".md", ""));

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