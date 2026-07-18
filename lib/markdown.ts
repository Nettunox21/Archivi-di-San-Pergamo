import { marked } from "marked";

type Fazione = {
    bandiera: string;
    nome?: string;
    descrizione: string;
};

/**
 * Mini-parser YAML "fatto in casa": niente dipendenze esterne.
 * Supporta solo il sottoinsieme che serve all'infobox:
 *  - chiave: valore
 *  - chiave:
 *      sotto-chiave: valore        (mappa annidata)
 *  - chiave:
 *      - campo: valore              (lista di oggetti)
 *        campo2: valore
 *      - altro-valore-semplice      (lista di stringhe)
 */
function parseSimpleYaml(text: string): Record<string, any> {
    const rawLines = text.replace(/\t/g, "  ").split("\n");

    const lines = rawLines
        .map((l) => {
            const match = l.match(/^(\s*)(.*)$/);
            const indent = match ? match[1].length : 0;
            const content = match ? match[2] : l;
            return { indent, content };
        })
        .filter((l) => l.content.trim().length > 0);

    let pos = 0;

    function parseBlock(minIndent: number): any {
        if (pos >= lines.length) return null;
        const first = lines[pos];
        if (first.indent < minIndent) return null;

        if (first.content.trim().startsWith("- ")) {
            // LISTA
            const list: any[] = [];
            const listIndent = first.indent;

            while (
                pos < lines.length &&
                lines[pos].indent === listIndent &&
                lines[pos].content.trim().startsWith("- ")
            ) {
                const itemContent = lines[pos].content.trim().slice(2);
                pos++;
                const colonIdx = itemContent.indexOf(":");

                if (colonIdx !== -1) {
                    // elemento della lista è un oggetto (es. fazione)
                    const obj: Record<string, any> = {};
                    const k = itemContent.slice(0, colonIdx).trim();
                    const v = itemContent.slice(colonIdx + 1).trim();
                    obj[k] = v;

                    // righe successive più indentate = altri campi dello stesso oggetto
                    while (
                        pos < lines.length &&
                        lines[pos].indent > listIndent &&
                        !lines[pos].content.trim().startsWith("- ")
                    ) {
                        const line = lines[pos].content.trim();
                        const ci = line.indexOf(":");
                        if (ci !== -1) {
                            const kk = line.slice(0, ci).trim();
                            const vv = line.slice(ci + 1).trim();
                            obj[kk] = vv;
                        }
                        pos++;
                    }
                    list.push(obj);
                } else {
                    // elemento della lista è una stringa semplice (es. immagine)
                    list.push(itemContent);
                }
            }
            return list;
        } else {
            // MAPPA
            const map: Record<string, any> = {};
            const mapIndent = first.indent;

            while (pos < lines.length && lines[pos].indent === mapIndent) {
                const line = lines[pos].content.trim();
                const colonIdx = line.indexOf(":");
                if (colonIdx === -1) {
                    pos++;
                    continue;
                }
                const key = line.slice(0, colonIdx).trim();
                const rest = line.slice(colonIdx + 1).trim();
                pos++;

                if (rest.length > 0) {
                    map[key] = rest;
                } else if (pos < lines.length && lines[pos].indent > mapIndent) {
                    map[key] = parseBlock(lines[pos].indent);
                } else {
                    map[key] = "";
                }
            }
            return map;
        }
    }

    return parseBlock(0) ?? {};
}

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
                parsed = parseSimpleYaml(content) ?? {};
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
