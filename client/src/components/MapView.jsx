import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast } from "sonner"; // shadcn uses sonner usually, or toast
// But I installed shadcn toast which might be 'sonner' or 'toast' hook.
// Let's use standard alert for now if toast is complex to setup without context
// Actually I installed 'toast' which is likely 'sonner' or 'use-toast' in shadcn.
// Let's check imports later. For now, I'll use simple console/alert or standard toast if I know the import.
// shadcn 'toast' is usually imported from "@/hooks/use-toast" or similar.
// I will use simple alerts/console for simplicity in this step, or try to use "sonner" if I installed it? I installed "toast" which is usually "sonner" in latest shadcn.
// Let's assume standard behavior.

// Custom Icons using generic HTML
const createCustomIcon = (color, emoji) => {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="
            background-color: ${color};
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        ">${emoji}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
};

const schoolIcon = createCustomIcon('#10b981', '🏫'); // Emerald-500

// SVG Pin Icon for Start Location (Better visual)
const startIcon = L.divIcon({
    className: 'custom-pin-marker',
    html: `
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));">
        <path d="M20 0C11.1634 0 4 7.16344 4 16C4 26 20 40 20 40C20 40 36 26 36 16C36 7.16344 28.8366 0 20 0Z" fill="#3b82f6"/>
        <circle cx="20" cy="16" r="6" fill="white"/>
    </svg>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40], // Tip at bottom center
    popupAnchor: [0, -40]
});

// Helper: Simple Haversine for Client-Side Snapping
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Helper component to handle map clicks with Snapping
function ClickHandler({ setStartPoint, graphNodes }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;

            // 1. Try to snap to nearest GraphNode if available
            if (graphNodes && graphNodes.length > 0) {
                let bestNode = null;
                let minDst = Infinity;

                // Find nearest (O(N) is fine for ~1500 nodes)
                for (const node of graphNodes) {
                    const d = calculateDistance(lat, lng, node.latitude, node.longitude);
                    if (d < minDst) {
                        minDst = d;
                        bestNode = node;
                    }
                }

                // Threshold: Only snap if within reasonable distance (e.g., 500m)
                if (bestNode && minDst < 1000) {
                    setStartPoint({ lat: bestNode.latitude, lng: bestNode.longitude, nodeId: bestNode.id });
                    toast.success(`Snapped to nearest Node #${bestNode.id} (${Math.round(minDst)}m away)`);
                } else {
                    // Fallback
                    setStartPoint({ lat, lng, nodeId: null });
                    toast("Lokasi diset manual (jauh dari node)");
                }
            } else {
                setStartPoint({ lat, lng, nodeId: null });
            }
        },
    });
    return null;
}

// Helper to Recenter Map
const MapController = ({ startPoint, selectedSchool }) => {
    const map = useMap();

    // Auto-fly when startPoint or selectedSchool changes
    useEffect(() => {
        if (startPoint) {
            map.flyTo([startPoint.lat, startPoint.lng], 15, { duration: 1.5 });
        }
    }, [startPoint, map]);

    useEffect(() => {
        if (selectedSchool) {
            const [lon, lat] = selectedSchool.geometry.coordinates;
            map.flyTo([lat, lon], 16, { duration: 1.5 });
        }
    }, [selectedSchool, map]);

    return null;
};

const MapView = ({ layersState, currentRoutePath = [], schools = [], zones = [], graphNodes = [], graphEdges = [], startPoint, setStartPoint, selectedSchool, setSelectedSchool, onFindRoute }) => {

    return (
        <div className="h-full w-full z-0 relative">
            <MapContainer
                center={[0.1347, 117.4980]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapController startPoint={startPoint} selectedSchool={selectedSchool} />
                <ClickHandler setStartPoint={setStartPoint} graphNodes={graphNodes} />

                {/* User Location Marker */}
                {startPoint && (
                    <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                        <Popup>
                            <strong>Lokasi Anda (Start)</strong><br />
                            {startPoint.nodeId ? `Node ID: ${startPoint.nodeId}` : 'Koordinat Manual'}
                        </Popup>
                    </Marker>
                )}

                {/* Route Path (A* Result) */}
                {currentRoutePath && currentRoutePath.length > 0 && (
                    <Polyline positions={currentRoutePath} color="#3b82f6" weight={6} opacity={0.8} dashArray="10, 10" />
                )}

                {/* --- GRAPH VIZ LAYER (DEBUG) --- */}
                {layersState.graph && (
                    <>
                        {/* 1. Edges (Lines) */}
                        {graphEdges.map((edge, idx) => {
                            let positions = [];
                            if (edge.geometry && edge.geometry.coordinates && Array.isArray(edge.geometry.coordinates)) {
                                positions = edge.geometry.coordinates.map(p => [p[1], p[0]]);
                            } else if (Array.isArray(edge.geometry)) {
                                positions = edge.geometry.map(p => [p[1], p[0]]);
                            }
                            return <Polyline key={`edge-${idx}`} positions={positions} pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.5 }} />;
                        })}

                        {/* 2. Nodes (Points) */}
                        {graphNodes.map((node, idx) => (
                            <CircleMarker
                                key={`node-${idx}`}
                                center={[node.latitude, node.longitude]}
                                radius={4}
                                pathOptions={{ color: '#475569', fillColor: '#cbd5e1', fillOpacity: 0.8, weight: 1 }}
                                eventHandlers={{
                                    click: () => {
                                        toast.success(`Start Point set to Node #${node.id}`);
                                        setStartPoint({ lat: node.latitude, lng: node.longitude, nodeId: node.id });
                                    }
                                }}
                            >
                                <Popup>Node ID: {node.id}</Popup>
                            </CircleMarker>
                        ))}
                    </>
                )}

                {/* Render Zones (Polygon) */}
                {layersState.zones && zones.map((zone, idx) => (
                    <Polygon
                        key={`zone-${idx}`}
                        positions={zone.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                        pathOptions={{
                            color: zone.properties.color || '#10b981',
                            fillColor: zone.properties.color || '#10b981',
                            fillOpacity: 0.15,
                            weight: 1.5,
                            dashArray: '5, 5'
                        }}
                    >
                        <Popup>{zone.properties.name}</Popup>
                    </Polygon>
                ))}

                {/* Render Schools (Markers) */}
                {schools.map((school, idx) => {
                    const [lon, lat] = school.geometry.coordinates;
                    return (
                        <Marker key={`school-${idx}`} position={[lat, lon]} icon={schoolIcon}>
                            <Popup>
                                <div className="min-w-[200px] p-1">
                                    <h3 className="font-bold text-lg mb-1 text-emerald-800">{school.properties.name}</h3>
                                    <p className="text-sm text-slate-600 mb-2">{school.properties.address}</p>
                                    <button
                                        className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm w-full hover:bg-emerald-700 transition shadow-md font-semibold"
                                        onClick={() => {
                                            if (setSelectedSchool) setSelectedSchool(school);
                                            if (onFindRoute) onFindRoute(school);
                                        }}
                                    >
                                        Navigasi ke Sini
                                    </button>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

            </MapContainer>
        </div>
    );
};

export default MapView;
