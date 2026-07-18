import { marked } from "marked";
import yaml from "js-yaml";

type Fazione = {
    bandiera: string;
    nome?: string;
    descrizione: string;
};

export function parseWiki(md: string) {
    // 1. REMOVE FRONTMATTER
    md = md.replace(/^---[\s\S]*?---/, "");

    // 2. EXTRACT INFOBOX BEFORE MARKED TOUCHES IT
    let infoboxHTML = "";
    md = md.replace(
        /:::infobox([\s\S]*?):::/,
        (_, content) => {
            let parsed: Record<string, any> = {};
            try {
                parsed = (yaml.load(content) as Record<string, any>) ?? {};
            } catch (e) {
                console.error("Errore nel parsing dell'infobox:", e);
                parsed = {};
            }

            const title: string = parsed.title ?? "Info";

            // Galleria: usa "images" (array) se presente, altrimenti fallback su "image" singola
            const images: string[] = Array.isArray(parsed.images)
                ? parsed.images
                : parsed.image
                ? [parsed.image]
                : [];

            // Campi semplici chiave/valore (Data, Luogo, Casus Belli, ecc.)
            const data: Record<string, any> = parsed.data ?? {};

            // Fazioni coinvolte
            const fazioni: Fazione[] = Array.isArray(parsed.fazioni) ? parsed.fazioni : [];

            const galleryHTML = images.length
                ? `<div class="infobox-gallery">
                     <div class="infobox-gallery-track">
                       ${images
                           .map(
                               (src, i) =>
                                   `<img src="${src}" alt="${title} - immagine ${i + 1}" class="infobox-gallery-image" />`
                           )
                           .join("")}
                     </div>
                   </div>`
                : "";

            const rowsHTML = Object.entries(data)
                .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
                .join("");

            const fazioniHTML = fazioni.length
                ? `<div class="infobox-fazioni">
                     <h3>Fazioni coinvolte</h3>
                     ${fazioni
                         .map(
                             (f) => `
                       <div class="infobox-fazione">
                         <img src="${f.bandiera}" alt="${f.nome ?? "Bandiera fazione"}" class="infobox-fazione-flag" />
                         <div class="infobox-fazione-desc">
                           ${f.nome ? `<strong>${f.nome}</strong>` : ""}
                           <p>${f.descrizione ?? ""}</p>
                         </div>
                       </div>`
                         )
                         .join("")}
                   </div>`
                : "";

            infoboxHTML = `
                <aside class="infobox">
                    ${galleryHTML}
                    <h2>${title}</h2>
                    ${rowsHTML ? `<table><tbody>${rowsHTML}</tbody></table>` : ""}
                    ${fazioniHTML}
                </aside>
            `;

            return ""; // REMOVE from markdown completely
        }
    );

    // 3. NOW PARSE CLEAN MARKDOWN
    const contentHTML = marked.parse(md);

    // 4. COMBINE FINAL OUTPUT
    return `
        <div class="wiki-layout">
            ${infoboxHTML}
            <article class="markdown-content">
                ${contentHTML}
            </article>
        </div>
    `;
}
