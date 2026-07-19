import { marked } from "marked";

type Fazione = {
    bandiera: string;
    nome?: string;
    descrizione: string;
};

/**
 * Mini-parser YAML "fatto in casa": niente dipendenze esterne.
 * Supporta solo il sottoinsieme che serve all'infobox e ai blocchi wiki:
 *  - chiave: valore
 *  - chiave:
 *      sotto-chiave: valore        (mappa annidata)
 *  - chiave:
 *      - campo: valore              (lista di oggetti)
 *        campo2: valore
 *      - altro-valore-semplice      (lista di stringhe)
 */
function parseSimpleYaml(text: string): any {
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

/** Genera l'HTML per una lista "bandiera + descrizione", riusata sia dall'infobox che dal blocco standalone */
function renderFlagList(items: Fazione[]): string {
    return items
        .map(
            (f) => `
              <div class="flag-table-item">
                <img src="${f.bandiera}" alt="${f.nome ?? "Bandiera"}" class="flag-table-flag" />
                <div class="flag-table-desc">
                  ${f.nome ? `<strong>${f.nome}</strong>` : ""}
                  <p>${f.descrizione ?? ""}</p>
                </div>
              </div>`
        )
        .join("");
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

            // Immagine singola (formato originale 1:2, NESSUN ritaglio forzato)
            // vs galleria vera con più immagini (scorrevole, formato indipendente)
            const hasGallery = Array.isArray(parsed.images) && parsed.images.length > 0;
            const images: string[] = hasGallery ? parsed.images : [];
            const singleImage: string | null = !hasGallery && parsed.image ? parsed.image : null;

            // Campi semplici chiave/valore: supporta sia il vecchio formato
            // (campi scritti direttamente a livello principale, es. pagine paese)
            // sia il nuovo formato annidato "data: { ... }" (es. pagine guerra)
            const reservedKeys = ["title", "image", "images", "data", "fazioni"];
            const looseData: Record<string, any> = {};
            for (const [key, value] of Object.entries(parsed)) {
                if (!reservedKeys.includes(key) && typeof value !== "object") {
                    looseData[key] = value;
                }
            }
            const data: Record<string, any> = { ...looseData, ...(parsed.data ?? {}) };

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

            // Immagine singola: stesso markup/classe del comportamento originale, formato intatto
            const singleImageHTML = singleImage
                ? `<img src="${singleImage}" alt="${title}" class="infobox-image" />`
                : "";

            const rowsHTML = Object.entries(data)
                .map(([key, value]) => `<tr><td>${key}</td><td>${value}</td></tr>`)
                .join("");

            const fazioniHTML = fazioni.length
                ? `<div class="infobox-fazioni">
                     <h3>Fazioni coinvolte</h3>
                     ${renderFlagList(fazioni)}
                   </div>`
                : "";

            infoboxHTML = `
                <aside class="infobox">
                    ${singleImageHTML}
                    ${galleryHTML}
                    <h2>${title}</h2>
                    ${rowsHTML ? `<table><tbody>${rowsHTML}</tbody></table>` : ""}
                    ${fazioniHTML}
                </aside>
            `;

            return ""; // REMOVE from markdown completely
        }
    );

    // 3. NUOVO BLOCCO RIUTILIZZABILE ":::bandiere" (usabile ovunque nel corpo dell'articolo)
    md = md.replace(/:::bandiere([\s\S]*?):::/g, (_, content) => {
        let parsed: any = {};
        try {
            parsed = parseSimpleYaml(content) ?? {};
        } catch (e) {
            console.error("Errore nel parsing del blocco bandiere:", e);
            return "";
        }

        // Supporta sia una lista diretta, sia { title, items }
        const title: string | undefined =
            !Array.isArray(parsed) && typeof parsed.title === "string" ? parsed.title : undefined;
        const items: Fazione[] = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed.items)
            ? parsed.items
            : [];

        if (!items.length) return "";

        return `
            <div class="flag-table">
                ${title ? `<h3 class="flag-table-title">${title}</h3>` : ""}
                ${renderFlagList(items)}
            </div>
        `;
    });

    // 4. NOW PARSE CLEAN MARKDOWN
    const contentHTML = marked.parse(md);

    // 5. COMBINE FINAL OUTPUT
    return `
        <div class="wiki-layout">
            ${infoboxHTML}
            <article class="markdown-content">
                ${contentHTML}
            </article>
        </div>
    `;
}
