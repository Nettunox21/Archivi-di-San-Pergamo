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

/** Distanza euclidea tra due touch points (per il pinch-zoom) */
function touchDistance(t1: React.Touch, t2: React.Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

export default function MappaPage() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [geo, setGeo] = useState<CellsGeoJSON | null>(null);
    const [statesInfo, setStatesInfo] = useState<StatesMap>({});
    const [selected, setSelected] = useState<CellFeature | null>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const isPanning = useRef(false);
    const didPan = useRef(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const panRef = useRef({ x: 0, y: 0 });
    const zoomRef = useRef(1);
    const lastTouchDistance = useRef<number | null>(null);

    const offscreenRef = useRef<HTMLCanvasElement | null>(null);
    const projRef = useRef({ minX: 0, minY: 0, scale: 1 });
    const initializedView = useRef(false);

    useEffect(() => {
        function updateSize() {
            setCanvasSize({ width: window.innerWidth, height: window.innerHeight - 60 });
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

    // costruisce l'immagine offscreen (tutte le celle disegnate una sola volta)
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
            const props = f.properties;
            const ring = f.geometry.coordinates[0];

            let fill = OCEAN_COLOR;
            if (props.type === "lake") fill = LAKE_COLOR;
            else if (props.type === "island") {
                if (props.state !== 0) {
                    const info = statesInfo[String(props.state)];
                    fill = info?.color || fallbackColorForState(props.state);
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

    // centra la vista la prima volta che mappa e canvas sono pronti
    useEffect(() => {
        const off = offscreenRef.current;
        if (!off || canvasSize.width === 0 || initializedView.current) return;
        initializedView.current = true;
        const initialZoom = Math.min(canvasSize.width / off.width, canvasSize.height / off.height, 1);
        zoomRef.current = initialZoom;
        panRef.current = {
            x: (canvasSize.width - off.width * initialZoom) / 2,
            y: (canvasSize.height - off.height * initialZoom) / 2,
        };
        setZoom(initialZoom);
        setPan({ ...panRef.current });
    }, [geo, statesInfo, canvasSize]);

    useEffect(() => {
        draw();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pan, zoom, canvasSize]);

    function draw() {
        const canvas = canvasRef.current;
        const off = offscreenRef.current;
        if (!canvas || !off) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(panRef.current.x, panRef.current.y);
        ctx.scale(zoomRef.current, zoomRef.current);
        ctx.drawImage(off, 0, 0);
        ctx.restore();
    }

    function findFeatureAt(screenX: number, screenY: number): CellFeature | null {
        if (!geo) return null;
        const { minX, minY, scale } = projRef.current;
        const worldX = (screenX - panRef.current.x) / zoomRef.current;
        const worldY = (screenY - panRef.current.y) / zoomRef.current;
        const lng = worldX / scale + minX;
        const lat = worldY / scale + minY;

        for (const f of geo.features) {
            if (pointInRing(lng, lat, f.geometry.coordinates[0])) return f;
        }
        return null;
    }

    function selectAtScreenPoint(screenX: number, screenY: number) {
        const found = findFeatureAt(screenX, screenY);
        if (!found) return;
        if (selected && selected.properties.id === found.properties.id) {
            setSelected(null);
        } else {
            setSelected(found);
        }
    }

    function zoomAt(centerX: number, centerY: number, newZoom: number) {
        const clamped = Math.min(Math.max(newZoom, 0.2), 8);
        panRef.current = {
            x: centerX - (centerX - panRef.current.x) * (clamped / zoomRef.current),
            y: centerY - (centerY - panRef.current.y) * (clamped / zoomRef.current),
        };
        zoomRef.current = clamped;
        setZoom(clamped);
        setPan({ ...panRef.current });
    }

    // ---------- MOUSE (desktop) ----------

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
        if (didPan.current) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        selectAtScreenPoint(e.clientX - rect.left, e.clientY - rect.top);
    }

    function handleWheel(e: React.WheelEvent) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        zoomAt(mouseX, mouseY, zoomRef.current * delta);
    }

    // ---------- TOUCH (mobile) ----------

    function handleTouchStart(e: React.TouchEvent) {
        if (e.touches.length === 1) {
            isPanning.current = true;
            didPan.current = false;
            lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            lastTouchDistance.current = null;
        } else if (e.touches.length === 2) {
            isPanning.current = false;
            lastTouchDistance.current = touchDistance(e.touches[0], e.touches[1]);
        }
    }

    function handleTouchMove(e: React.TouchEvent) {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();

        if (e.touches.length === 1 && isPanning.current) {
            const dx = e.touches[0].clientX - lastMouse.current.x;
            const dy = e.touches[0].clientY - lastMouse.current.y;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didPan.current = true;
            lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
            setPan({ ...panRef.current });
        } else if (e.touches.length === 2 && lastTouchDistance.current !== null) {
            const newDistance = touchDistance(e.touches[0], e.touches[1]);
            const scaleFactor = newDistance / lastTouchDistance.current;
            const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
            const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
            zoomAt(centerX, centerY, zoomRef.current * scaleFactor);
            lastTouchDistance.current = newDistance;
            didPan.current = true;
        }
    }

    function handleTouchEnd(e: React.TouchEvent) {
        const canvas = canvasRef.current;
        if (e.touches.length === 0) {
            const wasPanning = isPanning.current;
            isPanning.current = false;
            lastTouchDistance.current = null;
            if (!didPan.current && wasPanning && canvas && e.changedTouches.length === 1) {
                const rect = canvas.getBoundingClientRect();
                const touch = e.changedTouches[0];
                selectAtScreenPoint(touch.clientX - rect.left, touch.clientY - rect.top);
            }
        } else if (e.touches.length === 1) {
            lastTouchDistance.current = null;
            isPanning.current = true;
            didPan.current = true;
            lastMouse.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    }

    const props = selected?.properties;
    const selectedStateInfo = props && props.state !== 0 ? statesInfo[String(props.state)] : null;
    const selectedFaction = selectedStateInfo?.faction
        ? factions.find((f) => f.name === selectedStateInfo.faction)
        : null;

    let title = "Oceano";
    if (props?.type === "lake") title = "Lago";
    else if (props?.type === "island") {
        title = props.state === 0 ? "Terra di nessuno" : selectedStateInfo?.name || `Stato #${props.state}`;
    }

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
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ cursor: "grab", display: "block", touchAction: "none" }}
            />

            {selected && props && (
                <div className="map-infobox">
                    {selectedFaction ? (
                        <>
                            <div className="map-infobox-banner">
                                <img src={selectedFaction.banner} alt={selectedFaction.name} />
                            </div>
                            <div className="map-infobox-body">
                                <p className="map-infobox-coord">Cella #{props.id}</p>
                                <h2 className="map-infobox-title">{title}</h2>
                                <p className="map-infobox-desc">{selectedFaction.description}</p>
                                <p className="map-infobox-info">{selectedFaction.info}</p>
                            </div>
                        </>
                    ) : (
                        <div className="map-infobox-body">
                            <p className="map-infobox-coord">Cella #{props.id}</p>
                            <h2 className="map-infobox-title">{title}</h2>
                            <p className="map-infobox-desc">
                                {props.type === "ocean" && "Acque internazionali."}
                                {props.type === "lake" && "Specchio d'acqua interno."}
                                {props.type === "island" && props.state === 0 && "Territorio non rivendicato."}
                                {props.type === "island" && props.state !== 0 && (
                                    <>
                                        Provincia #{props.province}
                                        {props.population > 0 ? ` · Popolazione ${Math.round(props.population * 1000).toLocaleString("it-IT")}` : ""}
                                    </>
                                )}
                            </p>
                        </div>
                    )}
                    <button className="map-infobox-close" onClick={() => setSelected(null)}>✕</button>
                </div>
            )}
        </div>
    );
}
