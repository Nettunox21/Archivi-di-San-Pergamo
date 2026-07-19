import { marked } from "marked";
export function parseWiki(md: string) {
    // 1. REMOVE FRONTMATTER
    md = md.replace(/^---[\s\S]*?---/, "");
    // 2. EXTRACT INFObox BEFORE MARKED TOUCHES IT
    let infoboxHTML = "";
    md = md.replace(
        /:::infobox([\s\S]*?):::/,
        (_, content) => {
            const lines = content
                .split("\n")
                .map((l: string) => l.trim())
                .filter(Boolean);
            const data: Record<string, string> = {};
            const rows: string[] = [];
            for (const line of lines) {
                const [key, ...rest] = line.split(":");
                if (!key || !rest.length) continue;
                const k = key.trim().toLowerCase();
                const v = rest.join(":").trim();
                if (k === "title") {
                    data.title = v;
                    continue;
                }
                if (k === "image") {
                    data.image = v;
                    continue;
                }
                rows.push(<tr><td>${key}</td><td>${v}</td></tr>);
            }
            infoboxHTML = 
                <aside class="infobox">
                    ${data.image ? <img src="${data.image}" /> : ""}
                    <h2>${data.title ?? "Info"}</h2>
                    <table>
                        ${rows.join("")}
                    </table>
                </aside>
            ;
            return ""; // REMOVE from markdown completely
        }
    );
    // 3. NOW PARSE CLEAN MARKDOWN
    const contentHTML = marked.parse(md);
    // 4. COMBINE FINAL OUTPUT
    return 
        <div class="wiki-layout">
            ${infoboxHTML}
            <article class="markdown-content">
                ${contentHTML}
            </article>
        </div>
    ;
}
