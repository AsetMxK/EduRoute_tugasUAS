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

// Helper component to handle map clicks with Snapping (Simplified for ORS: No Graph Snapping)
function ClickHandler({ setStartPoint }) {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            // Direct set without snapping to graph nodes
            setStartPoint({ lat, lng, nodeId: null });
            // toast("Lokasi diset"); 
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



const MapView = ({ layersState, currentRoutePath = [], routeData = null, lastMilePath = null, schools = [], schoolAreas = [], busStops = [], busStopAreas = [], busRoutes = [], roads = null, startPoint, setStartPoint, selectedSchool, setSelectedSchool, onFindRoute }) => {

    return (
        <div className="h-full w-full z-0 relative">
            <MapContainer
                center={[0.1347, 117.4980]}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <MapController startPoint={startPoint} selectedSchool={selectedSchool} />
                <ClickHandler setStartPoint={setStartPoint} />

                {/* Render Streets / Roads */}
                {layersState.roads && roads && roads.features && roads.features.map((feature, idx) => {
                    const geometry = feature.geometry;
                    if (geometry.type === 'MultiLineString') {
                        return geometry.coordinates.map((segment, segIdx) => (
                            <Polyline
                                key={`road-${idx}-${segIdx}`}
                                positions={segment.map(coord => [coord[1], coord[0]])}
                                pathOptions={{ color: '#475569', weight: 4, opacity: 0.9 }}
                            />
                        ));
                    } else if (geometry.type === 'LineString') {
                        return (
                            <Polyline
                                key={`road-${idx}`}
                                positions={geometry.coordinates.map(coord => [coord[1], coord[0]])}
                                pathOptions={{ color: '#475569', weight: 4, opacity: 0.9 }}
                            />
                        );
                    }
                    return null;
                })}

                {/* Debug Layer: Navigation Points */}
                {layersState.routingPoints && schools.map((school, idx) => {
                    const routingLoc = school.properties.routingLocation;
                    if (!routingLoc) return null;
                    const [lon, lat] = routingLoc.coordinates;
                    return (
                        <CircleMarker
                            key={`debug-nav-point-${idx}`}
                            center={[lat, lon]}
                            radius={4}
                            pathOptions={{
                                color: '#ffffff',
                                weight: 2,
                                fillColor: '#ef4444', // Red-500
                                fillOpacity: 0.9
                            }}
                        >
                            <Popup className="text-xs font-bold text-red-600">
                                Titik Navigasi (Gate)<br />{school.properties.name}
                            </Popup>
                        </CircleMarker>
                    );
                })}

                {/* --- NEW LAYERS --- */}

                {/* 1. School Areas (Polygons) */}
                {layersState.schoolAreas && schoolAreas.map((area, idx) => (
                    <Polygon
                        key={`school-area-${idx}`}
                        positions={area.geometry.coordinates[0].map(coord => [coord[1], coord[0]])} // GeoJSON [lon, lat] -> Leaflet [lat, lon]
                        pathOptions={{
                            color: '#10b981',
                            fillColor: '#10b981',
                            fillOpacity: 0.2,
                            weight: 2,
                        }}
                    >
                        <Popup className="text-sm font-bold text-emerald-700">Area {area.properties.name}</Popup>
                    </Polygon>
                ))}

                {/* 2. Bus Bus Stop Areas (Polygons) */}
                {layersState.busStops && busStopAreas.map((area, idx) => (
                    <Polygon
                        key={`stop-area-${idx}`}
                        positions={area.geometry.coordinates[0].map(coord => [coord[1], coord[0]])}
                        pathOptions={{
                            color: '#3b82f6',
                            fillColor: '#3b82f6',
                            fillOpacity: 0.2,
                            weight: 1,
                            dashArray: '4, 4'
                        }}
                    >
                        <Popup className="text-xs">Area Halte {area.properties.name}</Popup>
                    </Polygon>
                ))}

                {/* 3. Bus Routes (Lines) */}
                {layersState.busRoutes && busRoutes.map((route, idx) => (
                    <Polyline
                        key={`bus-route-${idx}`}
                        positions={route.geometry.type === 'MultiLineString'
                            ? route.geometry.coordinates.map(segment => segment.map(coord => [coord[1], coord[0]]))
                            : route.geometry.coordinates.map(coord => [coord[1], coord[0]])
                        }
                        pathOptions={{
                            color: route.properties.color || '#f59e0b',
                            weight: 5,
                            opacity: 0.8,
                            lineCap: 'round',
                            lineJoin: 'round'
                        }}
                    >
                        <Popup>
                            <div className="text-sm">
                                <b className="text-amber-700 block">{route.properties.name}</b>
                                <span className="text-xs text-slate-500">{route.properties.description}</span>
                            </div>
                        </Popup>
                    </Polyline>
                ))}

                {/* 4. Bus Stops (Markers) */}
                {layersState.busStops && busStops.map((stop, idx) => (
                    <CircleMarker
                        key={`stop-marker-${idx}`}
                        center={[stop.geometry.coordinates[1], stop.geometry.coordinates[0]]}
                        radius={6}
                        pathOptions={{
                            color: '#ffffff',
                            weight: 2, // Border around the dot
                            fillColor: '#3b82f6', // Blue dot
                            fillOpacity: 1
                        }}
                    >
                        <Popup>
                            <strong>🚏 {stop.properties.name}</strong><br />
                            <span className="text-xs text-slate-500">{stop.properties.address}</span>
                        </Popup>
                    </CircleMarker>
                ))}

                {/* User Location Marker */}
                {startPoint && (
                    <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
                        <Popup>
                            <strong>Lokasi Anda (Start)</strong><br />
                            Koordinat: {startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}
                        </Popup>
                    </Marker>
                )}

                {/* Route Path - Different colors for Bus vs Normal */}
                {routeData && routeData.isBusRoute ? (
                    <>
                        {/* Walking segment to bus stop */}
                        {routeData.walkPath && (
                            <Polyline
                                positions={routeData.walkPath}
                                pathOptions={{
                                    color: '#10b981', // Emerald green for walking
                                    weight: 5,
                                    opacity: 0.8
                                }}
                            >
                                <Popup>🚶 Jalan Kaki ke Halte</Popup>
                            </Polyline>
                        )}
                        {/* Bus route line */}
                        {routeData.busLinePath && (
                            <Polyline
                                positions={routeData.busLinePath}
                                pathOptions={{
                                    color: '#f59e0b', // Amber/Orange for bus
                                    weight: 6,
                                    opacity: 0.9,
                                    dashArray: '15, 10'
                                }}
                            >
                                <Popup>🚌 Jalur Bus Sekolah</Popup>
                            </Polyline>
                        )}
                    </>
                ) : (
                    /* Normal route (walk or drive to school directly) */
                    currentRoutePath && currentRoutePath.length > 0 && (
                        <Polyline
                            positions={currentRoutePath}
                            pathOptions={{
                                color: '#3b82f6', // Blue for normal routes
                                weight: 6,
                                opacity: 0.8
                            }}
                        />
                    )
                )}

                {/* Last Mile Path (Walking Segment) */}
                {lastMilePath && (
                    <Polyline
                        positions={lastMilePath}
                        pathOptions={{
                            color: '#10b981', // Emerald for walking
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '10, 10'
                        }}
                    >
                        <Popup className="text-sm font-bold text-emerald-700">Lanjutkan Jalan Kaki</Popup>
                    </Polyline>
                )}

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
                                            // Use routingLocation if available (passed from backend for precise point), else fallback to visual geometry
                                            // onFindRoute expects a school object, but we need to ensure it uses the correct coordinates.
                                            // We can modify onFindRoute or Create a synthetic object.
                                            // Assuming onFindRoute extracts coordinates from geometry.
                                            // Let's modify the object passed to onFindRoute.
                                            const navigationTarget = {
                                                ...school,
                                                geometry: school.properties.routingLocation || school.geometry
                                            };

                                            if (onFindRoute) onFindRoute(navigationTarget);
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
