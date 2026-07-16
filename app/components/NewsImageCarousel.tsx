// Salva questo file come: components/NewsImageCarousel.tsx

"use client";

import { useState } from "react";
import Image from "next/image";

export default function NewsImageCarousel({
    images,
    alt,
}: {
    images: string[];
    alt: string;
}) {
    const [index, setIndex] = useState(0);
    const hasMultiple = images.length > 1;

    function prev() {
        setIndex((i) => (i === 0 ? images.length - 1 : i - 1));
    }

    function next() {
        setIndex((i) => (i === images.length - 1 ? 0 : i + 1));
    }

    return (
        <div className="news-image-wrapper">
            <Image
                src={images[index]}
                alt={alt}
                fill
                className="news-image"
            />

            {hasMultiple && (
                <>
                    <button
                        type="button"
                        onClick={prev}
                        className="news-image-arrow news-image-arrow-left"
                        aria-label="Immagine precedente"
                    >
                        &lt;
                    </button>
                    <button
                        type="button"
                        onClick={next}
                        className="news-image-arrow news-image-arrow-right"
                        aria-label="Immagine successiva"
                    >
                        &gt;
                    </button>
                </>
            )}
        </div>
    );
}
