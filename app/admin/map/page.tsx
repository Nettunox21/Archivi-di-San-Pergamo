"use client";

import { useEffect, useRef, useState } from "react";
import { factions } from "@/app/data/factions";
import { OCEAN_COLOR, LAKE_COLOR, NEUTRAL_LAND_COLOR, fallbackColorForState } from "@/app/data/mapColors";
import { computeBBox, pointInRing } from "@/lib/mapGeo";

const GEOJSON_URL = "/data/mappa-mondo.geojson";
const TARGET_MAX_SIDE = 3000;

type CellProps = {
    id: number;
    type: "ocean" | "island" | "lake";
    state: number;
    province: number;
    population: number;
};

type CellFeature = {
    geometry: { coordinates: number[][][] };
    properties: CellProps;
};

type CellsGeoJSON = { features: CellFeature[] };

type StateInfo = { name?: string; color?: string; faction?: string };
type StatesMap = Record<string, StateInfo>;

export default function AdminMapStatesPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [geo, setGeo] = useState<CellsGeoJSON | null>(null);
    const [statesInfo, setStatesInfo] = useState<StatesMap>({});
    const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [color, setColor] = useState("#4a3520");
    const [faction, setFaction] = useState("");
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState("");
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const pan = useRef({ x: 0, y: 0 });
    const zoom = useRef(1);
    const isPanning = useRef(false);
    const didPan = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const projRef = useRef({ minX: 0, minY: 0, scale: 1 });
    const initializedView = useRef(false);

    useEffect(() => {
        function updateSize() {
            setCanvasSize({ width: Math.max(window.innerWidth - 340, 320), height: 700 });
        }
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        Promise.all([
            fetch(GEOJSON_URL).then((r) => r.json()),
            fetch("/api/map-states").then((r) => r.json()).catch(() => ({ states: {} })),
        ]).then(([geoData, statesData]) => {
            setGeo(geoData);
            setStatesInfo(statesData.states || {});
        });
    }, []);

    const stateIds = geo
        ? Array.from(new Set(geo.features.map((f) => f.properties.state).filter((id) => id !== 0))).sort((a, b) => a - b)
        : [];

    useEffect(() => {
        if (!geo) return;
        const { minX, minY, maxX, maxY } = computeBBox(geo.features);
        const width = maxX - minX || 1;
        const height = maxY - minY || 1;
        const scale = TARGET_MAX_SIDE / Math.max(width, height);
        projRef.current = { minX, minY, scale };

        const off = document.createElement("canvas");
        off.width = Math.ceil(width * scale);
        off.height = Math.ceil(height * scale);
        const ctx = off.getContext("2d");
        if (!ctx) return;

        for (const f of geo.features) {
            const p = f.properties;
            const ring = f.geometry.coordinates[0];

            let fill = OCEAN_COLOR;
            if (p.type === "lake") fill = LAKE_COLOR;
            else if (p.type === "island") {
                if (p.state !== 0) {
                    const info = statesInfo[String(p.state)];
                    fill = info?.color || fallbackColorForState(p.state);
                } else {
                    fill = NEUTRAL_LAND_COLOR;
                }
            }

            ctx.beginPath();
            ring.forEach(([lng, lat], i) => {
                const x = (lng - minX) * scale;
                const y = (lat - minY) * scale;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = "rgba(255,255,255,0.06)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        offscreenRef.current = off;
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geo, statesInfo]);

    useEffect(() => {
        const off = offscreenRef.current;
        if (!off || canvasSize.width === 0 || initializedView.current) return;
        initializedView.current = true;
        const initialZoom = Math.min(canvasSize.width / off.width, canvasSize.height / off.height, 1);
        zoom.current = initialZoom;
        pan.current = {
            x: (canvasSize.width - off.width * initialZoom) / 2,
            y: (canvasSize.height - off.height * initialZoom) / 2,
        };
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [geo, statesInfo, canvasSize]);

    useEffect(() => {
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canvasSize, selectedStateId]);

    function draw() {
        const canvas = canvasRef.current;
        const off = offscreenRef.current;
        if (!canvas || !off) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(pan.current.x, pan.current.y);
        ctx.scale(zoom.current, zoom.current);
        ctx.drawImage(off, 0, 0);

        if (selectedStateId !== null && geo) {
            const { minX, minY, scale } = projRef.current;
            ctx.strokeStyle = "#c8a96e";
            ctx.lineWidth = 2 / zoom.current;
            for (const f of geo.features) {
                if (f.properties.state !== selectedStateId) continue;
                const ring = f.geometry.coordinates[0];
                ctx.beginPath();
                ring.forEach(([lng, lat], i) => {
                    const x = (lng - minX) * scale;
                    const y = (lat - minY) * scale;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.closePath();
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    function findFeatureAt(screenX: number, screenY: number): CellFeature | null {
        if (!geo) return null;
        const { minX, minY, scale } = projRef.current;
        const worldX = (screenX - pan.current.x) / zoom.current;
        const worldY = (screenY - pan.current.y) / zoom.current;
        const lng = worldX / scale + minX;
        const lat = worldY / scale + minY;

        for (const f of geo.features) {
            if (pointInRing(lng, lat, f.geometry.coordinates[0])) return f;
        }
        return null;
    }

    function openStateEditor(id: number) {
        setSelectedStateId(id);
        const info = statesInfo[String(id)];
        setName(info?.name || "");
        setColor(info?.color || fallbackColorForState(id));
        setFaction(info?.faction || "");
    }

    function focusState(id: number) {
        if (!geo) return;
        openStateEditor(id);
        const { minX, minY, scale } = projRef.current;
        let minWX = Infinity, minWY = Infinity, maxWX = -Infinity, maxWY = -Infinity;
        for (const f of geo.features) {
            if (f.properties.state !== id) continue;
            for (const [lng, lat] of f.geometry.coordinates[0]) {
                const x = (lng - minX) * scale;
                const y = (lat - minY) * scale;
                if (x < minWX) minWX = x;
                if (x > maxWX) maxWX = x;
                if (y < minWY) minWY = y;
                if (y > maxWY) maxWY = y;
            }
        }
        if (!isFinite(minWX)) return;
        const w = maxWX - minWX || 1;
        const h = maxWY - minWY || 1;
        const fitZoom = Math.min(canvasSize.width / (w * 1.6), canvasSize.height / (h * 1.6), 4);
        zoom.current = fitZoom;
        pan.current = {
            x: canvasSize.width / 2 - (minWX + w / 2) * fitZoom,
            y: canvasSize.height / 2 - (minWY + h / 2) * fitZoom,
        };
        draw();
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
        pan.current = { x: pan.current.x + dx, y: pan.current.y + dy };
        draw();
    }

    function handleMouseUp(e: React.MouseEvent) {
        isPanning.current = false;
        if (didPan.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const found = findFeatureAt(e.clientX - rect.left, e.clientY - rect.top);
        if (!found || found.properties.state === 0) return;
        openStateEditor(found.properties.state);
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - pan.current.x) / zoom.current;
        const worldY = (mouseY - pan.current.y) / zoom.current;
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(Math.max(zoom.current * factor, 0.1), 8);
        pan.current = { x: mouseX - worldX * newZoom, y: mouseY - worldY * newZoom };
        zoom.current = newZoom;
        draw();
    }

    async function save() {
        if (selectedStateId === null) return;
        setSaving(true);
        setSavedMsg("");
        const updated: StatesMap = {
            ...statesInfo,
            [String(selectedStateId)]: {
                name: name || undefined,
                color: color || undefined,
                faction: faction || undefined,
            },
        };
        await fetch("/api/map-states", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ states: updated }),
        });
        setStatesInfo(updated);
        setSaving(false);
        setSavedMsg("Salvato.");
    }

    return (
        <div className="admin-map-layout">
            <canvas
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="map-canvas"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            />

            <div className="admin-panel">
                <h2>Stati della mappa</h2>

                <label>Vai a stato</label>
                <select
                    value={selectedStateId ?? ""}
                    onChange={(e) => e.target.value && focusState(Number(e.target.value))}
                >
                    <option value="">--</option>
                    {stateIds.map((id) => (
                        <option key={id} value={id}>
                            Stato #{id} — {statesInfo[String(id)]?.name || "senza nome"}
                        </option>
                    ))}
                </select>

                {selectedStateId !== null && (
                    <>
                        <hr />

                        <label>Nome</label>
                        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Stato #${selectedStateId}`} />

                        <label>Colore</label>
                        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />

                        <label>Fazione collegata</label>
                        <select value={faction} onChange={(e) => setFaction(e.target.value)}>
                            <option value="">-- nessuna --</option>
                            {factions.map((f) => (
                                <option key={f.name} value={f.name}>{f.name}</option>
                            ))}
                        </select>

                        <button onClick={save} disabled={saving}>
                            {saving ? "Salvataggio..." : "Salva"}
                        </button>
                        {savedMsg && <p style={{ color: "#c8a96e", fontSize: 12 }}>{savedMsg}</p>}
                    </>
                )}
            </div>
        </div>
    );
}
