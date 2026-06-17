"use client";

import { useState } from "react";
import Link from "next/link";

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);

    async function handleSearch(value: string) {
        setQuery(value);

        if (!value) {
            setResults([]);
            return;
        }

        const res = await fetch(`/api/search?q=${value}`);
        const data = await res.json();

        setResults(data);
    }

    return (
        <div style={{ position: "relative" }}>
            <input
                placeholder="Search documents..."
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
            />

            {results.length > 0 && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        background: "white",
                        border: "1px solid #a2a9b1",
                        zIndex: 1000,
                    }}
                >
                    {results.map((r) => (
                        <Link
                            key={r.slug}
                            href={`/archivio/${r.slug}`}
                            style={{
                                display: "block",
                                padding: "8px",
                                borderBottom: "1px solid #eee",
                            }}
                        >
                            {r.title}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}