"use client";

import { useEffect, useRef, useState } from "react";
import { factions } from "@/app/data/factions";

/* ================= TYPES ================= */

type CellType = "ocean" | "neutral" | "common" | "faction";

type Cell = {
    x: number;
    y: number;
    type: CellType;
    faction?: string;
    city?: string;
};

type MapData = {
    width: number;
    height: number;
    cells: Cell[];
};

/* ================= CONFIG ================= */

const CELL = 48;

/* STRICT + SAFE COLOR MAP */
const TYPE_COLORS: Record<CellType, string> = {
    ocean: "#1a2a3a",
    neutral: "#3a3530",
    common: "#2a3a2a",
    faction: "#4a2a4a",
};

/* IMPORTANT: ALL KEYS QUOTED (fixes Vercel crash) */
const FACTION_COLORS: Record<string, string> = {
    "San Pergamo": "#4a3520",
    "Profitgrado": "#3a2a4a",
    "Falconia": "#4a2a2a",
    "SENPAI": "#2a3a4a",
    "FIORD": "#2a4a3a",
};

/* ================= COORDS ================= */

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function toLabel(n: number) {
    if (n < 26) return ALPHA[n];
    return ALPHA[Math.floor(n / 26) - 1] + ALPHA[n % 26];
}

function parseCoord(input: string) {
    const m = input.trim().toUpperCase().match(/^([A-Z]{1,2})-(\d+)$/);
    if (!m) return null;

    const col = m[1];
    const row = parseInt(m[2], 10) - 1;

    const x =
        col.length === 1
            ? ALPHA.indexOf(col)
            : (ALPHA.indexOf(col[0]) + 1) * 26 + ALPHA.indexOf(col[1]);

    return { x, y: row };
}

/* ================= COMPONENT ================= */

export default function AdminMapPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [mapData, setMapData] = useState<MapData | null>(null);
    const [coord, setCoord] = useState("");
    const [selected, setSelected] = useState<Cell | null>(null);

    const [type, setType] = useState<CellType>("ocean");
    const [faction, setFaction] = useState("");
    const [city, setCity] = useState("");

    const camera = useRef({ x: 0, y: 0 });
    const zoom = useRef(1);

    const dragging = useRef(false);
    const last = useRef({ x: 0, y: 0 });

    const cellMap = useRef<Map<string, Cell>>(new Map());

    /* LOAD */
    useEffect(() => {
        fetch("/api/map")
            .then(r => r.json())
            .then((data: MapData) => {
                setMapData(data);

                const map = new Map<string, Cell>();
                data.cells.forEach(c => {
                    map.set(`${c.x},${c.y}`, c);
                });

                cellMap.current = map;
            });
    }, []);

    /* DRAW */
    useEffect(() => {
        draw();
    }, [mapData, selected]);

    function getCell(x: number, y: number): Cell {
        return (
            cellMap.current.get(`${x},${y}`) ?? {
                x,
                y,
                type: "ocean",
            }
        );
    }

    function draw() {
        const canvas = canvasRef.current;
        if (!canvas || !mapData) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(camera.current.x, camera.current.y);
        ctx.scale(zoom.current, zoom.current);

        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                const c = getCell(x, y);

                const color =
                    c.type === "faction" && c.faction
                        ? FACTION_COLORS[c.faction] ?? "#444"
                        : TYPE_COLORS[c.type];

                const px = x * CELL;
                const py = y * CELL;

                ctx.fillStyle = color;
                ctx.fillRect(px, py, CELL, CELL);

                const isSel =
                    selected?.x === x && selected?.y === y;

                ctx.strokeStyle = isSel
                    ? "#c8a96e"
                    : "rgba(255,255,255,0.05)";
                ctx.lineWidth = isSel ? 3 : 1;
                ctx.strokeRect(px, py, CELL, CELL);

                ctx.fillStyle = "rgba(255,255,255,0.25)";
                ctx.font = "10px serif";
                ctx.textAlign = "center";
                ctx.fillText(
                    `${toLabel(x)}-${y + 1}`,
                    px + CELL / 2,
                    py + CELL / 2
                );
            }
        }

        ctx.restore();
    }

    /* CLICK */
    function onClick(e: React.MouseEvent) {
        if (!mapData) return;

        const rect = canvasRef.current!.getBoundingClientRect();

        const mx =
            (e.clientX - rect.left - camera.current.x) /
            zoom.current;
        const my =
            (e.clientY - rect.top - camera.current.y) /
            zoom.current;

        const x = Math.floor(mx / CELL);
        const y = Math.floor(my / CELL);

        if (
            x < 0 ||
            y < 0 ||
            x >= mapData.width ||
            y >= mapData.height
        )
            return;

        const cell = getCell(x, y);

        setSelected(cell);
        setType(cell.type);
        setFaction(cell.faction ?? "");
        setCity(cell.city ?? "");
    }

    /* PAN */
    function onMouseDown(e: React.MouseEvent) {
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!dragging.current) return;

        camera.current.x += e.clientX - last.current.x;
        camera.current.y += e.clientY - last.current.y;

        last.current = { x: e.clientX, y: e.clientY };

        draw();
    }

    function onMouseUp() {
        dragging.current = false;
    }

    /* ZOOM */
    function onWheel(e: React.WheelEvent) {
        e.preventDefault();

        const rect = canvasRef.current!.getBoundingClientRect();

        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX =
            (mouseX - camera.current.x) / zoom.current;
        const worldY =
            (mouseY - camera.current.y) / zoom.current;

        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(
            Math.max(zoom.current * factor, 0.4),
            3
        );

        camera.current.x = mouseX - worldX * newZoom;
        camera.current.y = mouseY - worldY * newZoom;

        zoom.current = newZoom;

        draw();
    }

    /* SEARCH */
    function search() {
        const parsed = parseCoord(coord);
        if (!parsed) return;

        const cell = getCell(parsed.x, parsed.y);

        setSelected(cell);

        camera.current.x =
            -parsed.x * CELL * zoom.current + 200;
        camera.current.y =
            -parsed.y * CELL * zoom.current + 200;

        draw();
    }

    /* SAVE */
    async function save() {
        if (!mapData || !selected) return;

        const updatedCells = mapData.cells.filter(
            c =>
                !(c.x === selected.x && c.y === selected.y)
        );

        if (type !== "ocean") {
            updatedCells.push({
                x: selected.x,
                y: selected.y,
                type,
                faction:
                    type === "faction" ? faction : undefined,
                city: city || undefined,
            });
        }

        const newMap: MapData = {
            ...mapData,
            cells: updatedCells,
        };

        await fetch("/api/map", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newMap),
        });

        setMapData(newMap);

        const map = new Map<string, Cell>();
        newMap.cells.forEach(c => {
            map.set(`${c.x},${c.y}`, c);
        });
        cellMap.current = map;
    }

    return (
        <div className="admin-map-layout">
            <canvas
                ref={canvasRef}
                width={1200}
                height={800}
                className="map-canvas"
                onClick={onClick}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onWheel={onWheel}
            />

            <div className="admin-panel">
                <h2>Editor Mappa</h2>

                <label>Coordinate</label>
                <input
                    value={coord}
                    onChange={e => setCoord(e.target.value)}
                />

                <button onClick={search}>Vai</button>

                {selected && (
                    <>
                        <hr />

                        <label>Tipo</label>
                        <select
                            value={type}
                            onChange={e =>
                                setType(
                                    e.target.value as CellType
                                )
                            }
                        >
                            <option value="ocean">Oceano</option>
                            <option value="neutral">Neutro</option>
                            <option value="common">Comune</option>
                            <option value="faction">Fazione</option>
                        </select>

                        {type === "faction" && (
                            <>
                                <label>Fazione</label>
                                <select
                                    value={faction}
                                    onChange={e =>
                                        setFaction(e.target.value)
                                    }
                                >
                                    <option value="">--</option>
                                    {factions.map(f => (
                                        <option key={f.name}>
                                            {f.name}
                                        </option>
                                    ))}
                                </select>

                                <label>Città</label>
                                <input
                                    value={city}
                                    onChange={e =>
                                        setCity(e.target.value)
                                    }
                                />
                            </>
                        )}

                        <button onClick={save}>Salva</button>
                    </>
                )}
            </div>
        </div>
    );
}