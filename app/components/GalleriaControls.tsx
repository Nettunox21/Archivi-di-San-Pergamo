"use client";

import { useEffect } from "react";

export default function GalleriaControls() {
    useEffect(() => {
        function updateCount(track: HTMLElement) {
            const g = track.closest(".galleria");
            const count = g?.querySelector(".galleria-count");
            if (!count) return;
            const w = track.clientWidth || 1;
            const index = Math.round(track.scrollLeft / w);
            count.textContent = `${index + 1} / ${track.children.length}`;
        }

        function onClick(e: MouseEvent) {
            const target = e.target as HTMLElement | null;
            const btn = target?.closest<HTMLElement>(".galleria-btn");
            if (!btn) return;

            const g = btn.closest(".galleria");
            const track = g?.querySelector<HTMLElement>(".galleria-track");
            if (!track) return;

            const dir = Number(btn.dataset.dir ?? "1");
            const w = track.clientWidth;
            const n = track.children.length;
            const current = Math.round(track.scrollLeft / w);

            let next = current + dir;
            if (next < 0) next = n - 1;
            if (next >= n) next = 0;

            track.scrollTo({ left: next * w, behavior: "smooth" });
        }

        function onScroll(e: Event) {
            const t = e.target as HTMLElement | null;
            if (t && t.classList && t.classList.contains("galleria-track")) {
                updateCount(t);
            }
        }

        document.addEventListener("click", onClick);
        // lo scroll non "risale" nel DOM, quindi si ascolta in fase di cattura
        document.addEventListener("scroll", onScroll, true);

        return () => {
            document.removeEventListener("click", onClick);
            document.removeEventListener("scroll", onScroll, true);
        };
    }, []);

    return null;
}
