"use client";
import { useEffect, useRef, useState } from "react";
import { factions } from "@/app/data/factions";

type Cell = {
    x: number;
    y: number;
    type: "ocean" | "neutral" | "common" | "faction";
    faction?: string;
    city?: string;
};

type MapData = {
    width: number;
    height: number;
    cells: Cell[];
};

const CELL_SIZE = 64;
const HEADER_SIZE = 28; // spessore banda header (px, in screen space)

const TYPE_COLORS: Record<string, string> = {
    ocean: "#1a2a3a",
    neutral: "#3a3530",
    common: "#2a3a2a",
};

const FACTION_COLORS: Record<string, string> = {
    "San Pergamo": "#4a3520",
    "Profitgrado": "#3a2a4a",
    "Falconia": "#4a2a2a",
    "SENPAI": "#2a3a4a",
    "FIORD": "#2a4a3a",
};

/** Converte indice colonna (0-based) in etichetta: 0→A, 25→Z, 26→AA, 27→AB … */
function toColumnLabel(n: number): string {
    const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (n < 26) return ALPHA[n];
    return ALPHA[Math.floor(n / 26) - 1] + ALPHA[n % 26];
}

/** Restituisce la coordinata leggibile di una cella, es. "C-14" */
function cellCoord(x: number, y: number): string {
    return `${toColumnLabel(x)}-${y + 1}`;
}

export default function MappaPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [mapData, setMapData] = useState<MapData | null>(null);
    const [selectedCell, setSelectedCell] = useState<Cell | null>(null);
    const [pan, setPan] = useState({ x: HEADER_SIZE, y: HEADER_SIZE });
    const [zoom, setZoom] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
    const isPanning = useRef(false);
    const didPan = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const panRef = useRef({ x: HEADER_SIZE, y: HEADER_SIZE });
    const zoomRef = useRef(1);

    useEffect(() => {
        function updateSize() {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 60 });
        }
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        fetch("/api/map")
            .then((r) => r.json())
            .then(setMapData);
    }, []);

    useEffect(() => {
        if (!mapData || canvasSize.width === 0) return;
        draw();
    }, [mapData, pan, zoom, canvasSize]);

    function getCellAt(screenX: number, screenY: number): Cell | null {
        if (!mapData) return null;
        // sottrai l'header per ottenere coordinate nella zona mappa
        const mapX = screenX - HEADER_SIZE;
        const mapY = screenY - HEADER_SIZE;
        const gridX = Math.floor((mapX - panRef.current.x) / (CELL_SIZE * zoomRef.current));
        const gridY = Math.floor((mapY - panRef.current.y) / (CELL_SIZE * zoomRef.current));
        if (gridX < 0 || gridY < 0 || gridX >= mapData.width || gridY >= mapData.height) return null;
        const found = mapData.cells.find((c) => c.x === gridX && c.y === gridY);
        return found || { x: gridX, y: gridY, type: "ocean" };
    }

    function draw() {
        const canvas = canvasRef.current;
        if (!canvas || !mapData) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // — ZONA MAPPA (con pan/zoom, ritagliata sotto gli header) —
        ctx.save();
        ctx.beginPath();
        ctx.rect(HEADER_SIZE, HEADER_SIZE, canvas.width - HEADER_SIZE, canvas.height - HEADER_SIZE);
        ctx.clip();

        ctx.translate(HEADER_SIZE + panRef.current.x, HEADER_SIZE + panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);

        for (let y = 0; y < mapData.height; y++) {
            for (let x = 0; x < mapData.width; x++) {
                const cell = mapData.cells.find((c) => c.x === x && c.y === y) || { x, y, type: "ocean" as const };
                const cx = x * CELL_SIZE;
                const cy = y * CELL_SIZE;

                let color = TYPE_COLORS[cell.type] || TYPE_COLORS.ocean;
                if (cell.type === "faction" && cell.faction) {
                    color = FACTION_COLORS[cell.faction] || "#4a4a4a";
                }

                ctx.fillStyle = color;
                ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);

                ctx.strokeStyle = "rgba(255,255,255,0.06)";
                ctx.lineWidth = 1 / zoomRef.current;
                ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);

                if (zoomRef.current > 0.5) {
                    if (cell.type === "faction" && cell.faction) {
                        ctx.fillStyle = "rgba(200,169,110,0.9)";
                        ctx.font = `bold 10px 'Palatino Linotype', serif`;
                        ctx.textAlign = "center";
                        ctx.fillText(cell.faction, cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 - 6);
                        if (cell.city) {
                            ctx.fillStyle = "rgba(180,150,100,0.6)";
                            ctx.font = `8px 'Palatino Linotype', serif`;
                            ctx.fillText(cell.city, cx + CELL_SIZE / 2, cy + CELL_SIZE / 2 + 8);
                        }
                    } else if (cell.type === "neutral") {
                        ctx.fillStyle = "rgba(180,150,100,0.3)";
                        ctx.font = `8px 'Palatino Linotype', serif`;
                        ctx.textAlign = "center";
                        ctx.fillText("Terra di nessuno", cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
                    } else if (cell.type === "common") {
                        ctx.fillStyle = "rgba(180,150,100,0.3)";
                        ctx.font = `8px 'Palatino Linotype', serif`;
                        ctx.textAlign = "center";
                        ctx.fillText("Comunale", cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
                    }
                }
            }
        }

        ctx.restore();

        // — HEADER COLONNE (A, B … ZZ) — fisso in cima —
        ctx.save();
        ctx.fillStyle = "rgba(10,8,5,0.95)";
        ctx.fillRect(HEADER_SIZE, 0, canvas.width - HEADER_SIZE, HEADER_SIZE);

        ctx.font = `bold 10px 'Palatino Linotype', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let x = 0; x < mapData.width; x++) {
            const screenX = HEADER_SIZE + panRef.current.x + x * CELL_SIZE * zoomRef.current + (CELL_SIZE * zoomRef.current) / 2;
            if (screenX < HEADER_SIZE || screenX > canvas.width) continue;
            const label = toColumnLabel(x);
            // evidenzia la colonna selezionata
            if (selectedCell && selectedCell.x === x) {
                ctx.fillStyle = "rgba(200,169,110,0.15)";
                ctx.fillRect(
                    HEADER_SIZE + panRef.current.x + x * CELL_SIZE * zoomRef.current,
                    0,
                    CELL_SIZE * zoomRef.current,
                    HEADER_SIZE
                );
            }
            ctx.fillStyle = selectedCell?.x === x ? "#c8a96e" : "rgba(180,140,80,0.55)";
            ctx.fillText(label, screenX, HEADER_SIZE / 2);
        }

        // — HEADER RIGHE (1, 2 …) — fisso a sinistra —
        ctx.fillStyle = "rgba(10,8,5,0.95)";
        ctx.fillRect(0, HEADER_SIZE, HEADER_SIZE, canvas.height - HEADER_SIZE);

        ctx.font = `bold 9px 'Palatino Linotype', serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (let y = 0; y < mapData.height; y++) {
            const screenY = HEADER_SIZE + panRef.current.y + y * CELL_SIZE * zoomRef.current + (CELL_SIZE * zoomRef.current) / 2;
            if (screenY < HEADER_SIZE || screenY > canvas.height) continue;
            if (selectedCell && selectedCell.y === y) {
                ctx.fillStyle = "rgba(200,169,110,0.15)";
                ctx.fillRect(
                    0,
                    HEADER_SIZE + panRef.current.y + y * CELL_SIZE * zoomRef.current,
                    HEADER_SIZE,
                    CELL_SIZE * zoomRef.current
                );
            }
            ctx.fillStyle = selectedCell?.y === y ? "#c8a96e" : "rgba(180,140,80,0.55)";
            ctx.fillText(String(y + 1), HEADER_SIZE / 2, screenY);
        }

        // — ANGOLO in alto a sinistra (quadratino vuoto) —
        ctx.fillStyle = "rgba(10,8,5,0.95)";
        ctx.fillRect(0, 0, HEADER_SIZE, HEADER_SIZE);

        // bordi separatori header
        ctx.strokeStyle = "rgba(180,140,80,0.18)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(HEADER_SIZE, 0);
        ctx.lineTo(HEADER_SIZE, canvas.height);
        ctx.moveTo(0, HEADER_SIZE);
        ctx.lineTo(canvas.width, HEADER_SIZE);
        ctx.stroke();

        ctx.restore();
    }

    function handleMouseDown(e: React.MouseEvent) {
        isPanning.current = true;
        didPan.current = false;
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }

    function handleMouseMove(e: React.MouseEvent) {
        if (!isPanning.current) return;
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
        setPan({ ...panRef.current });
    }

    function handleMouseUp(e: React.MouseEvent) {
        isPanning.current = false;
        if (didPan.current) return; // era un pan, non un click

        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;

        // ignora click sugli header
        if (screenX < HEADER_SIZE || screenY < HEADER_SIZE) return;

        const cell = getCellAt(screenX, screenY);
        if (!cell) return;

        if (selectedCell && cell.x === selectedCell.x && cell.y === selectedCell.y) {
            setSelectedCell(null);
        } else {
            setSelectedCell(cell);
        }
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - HEADER_SIZE;
        const mouseY = e.clientY - rect.top - HEADER_SIZE;

        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoomRef.current * delta, 0.1), 4);

        panRef.current = {
            x: mouseX - (mouseX - panRef.current.x) * (newZoom / zoomRef.current),
            y: mouseY - (mouseY - panRef.current.y) * (newZoom / zoomRef.current),
        };
        zoomRef.current = newZoom;
        setZoom(newZoom);
        setPan({ ...panRef.current });
    }

    const selectedFaction = selectedCell?.type === "faction"
        ? factions.find((f) => f.name === selectedCell.faction)
        : null;

    return (
        <div style={{ position: "relative", width: "100%", height: "calc(100vh - 60px)", overflow: "hidden", background: "#0a0f14" }}>
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
                style={{ cursor: "grab", display: "block" }}
            />

            {selectedCell && (
                <div className="map-infobox">
                    {selectedCell.type === "faction" && selectedFaction ? (
                        <>
                            <div className="map-infobox-banner">
                                <img src={selectedFaction.banner} alt={selectedFaction.name} />
                            </div>
                            <div className="map-infobox-body">
                                <p className="map-infobox-coord">{cellCoord(selectedCell.x, selectedCell.y)}</p>
                                <h2 className="map-infobox-title">{selectedFaction.name}</h2>
                                {selectedCell.city && (
                                    <p className="map-infobox-city">📍 {selectedCell.city}</p>
                                )}
                                <p className="map-infobox-desc">{selectedFaction.description}</p>
                                <p className="map-infobox-info">{selectedFaction.info}</p>
                            </div>
                        </>
                    ) : (
                        <div className="map-infobox-body">
                            <p className="map-infobox-coord">{cellCoord(selectedCell.x, selectedCell.y)}</p>
                            <h2 className="map-infobox-title">
                                {selectedCell.type === "ocean" ? "Oceano" :
                                 selectedCell.type === "neutral" ? "Terra di nessuno" : "Comunale"}
                            </h2>
                            <p className="map-infobox-desc">
                                {selectedCell.type === "ocean" ? "Acque internazionali." :
                                 selectedCell.type === "neutral" ? "Territorio non rivendicato." : "Territorio comunale."}
                            </p>
                        </div>
                    )}
                    <button className="map-infobox-close" onClick={() => setSelectedCell(null)}>✕</button>
                </div>
            )}
        </div>
    );
}