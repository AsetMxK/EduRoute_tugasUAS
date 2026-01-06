// src/index.js
// Express Server untuk EduRoute Bontang
require('dotenv').config(); // Load env vars

const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const axios = require('axios'); // For ORS API

const app = express();
const PORT = process.env.PORT || 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Prisma
const prisma = new PrismaClient();

// ==========================================
// API ENDPOINTS
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'EduRoute Bontang Server is running' });
});

// Endpoint 1: Get GIS Data (Schools & Zones)
app.get('/api/gis-data', async (req, res) => {
    try {
        // 1. Fetch Schools (Native Point, Polygon, and Centroid of Polygon)
        // Note: MySQL 8 cannot calculating ST_Centroid for SRID 4326 directly.
        // Workaround: Cast to SRID 0 (Cartesian), calc centroid, cast back to 4326.
        const schoolsRaw = await prisma.$executeRawUnsafe ? await prisma.$queryRaw`
            SELECT id, name, type, address, description, 
            ST_AsGeoJSON(location) as location, 
            ST_AsGeoJSON(area) as area,
            ST_AsGeoJSON(ST_SRID(ST_Centroid(ST_SRID(area, 0)), 4326)) as centroid
            FROM schools
        ` : [];
        // Note: using $queryRaw directly as above. formatting slightly different.

        // Re-writing        // 1. Fetch Schools with their routes
        const schoolsRawResult = await prisma.$queryRaw`
            SELECT s.id, s.name, s.type, s.address, s.description,
            ST_AsGeoJSON(s.location) as location,
            ST_AsGeoJSON(s.area) as area,
            ST_AsGeoJSON(ST_SRID(ST_Centroid(ST_SRID(s.area, 0)), 4326)) as centroid,
            GROUP_CONCAT(brts.A) as route_ids
            FROM schools s
            LEFT JOIN _BusRouteToSchool brts ON s.id = brts.B
            GROUP BY s.id
        `;

        // 2. Bus Routes (JSON pathData)
        const busRoutes = await prisma.busRoute.findMany();

        // Helper to Parse ST_AsGeoJSON result
        // Prisma/MySQL driver might return it as a string OR as an object depending on version
        const parseGeo = (geoData) => {
            if (!geoData) return null;
            if (typeof geoData === 'string') {
                try {
                    return JSON.parse(geoData);
                } catch (e) {
                    console.error("Error parsing GeoJSON string:", geoData);
                    return null;
                }
            }
            return geoData; // Already an object
        }

        // --- CONSTRUCT GEOJSON ---

        // A. Schools (Points)
        const schoolsGeoJSON = {
            type: 'FeatureCollection',
            features: schoolsRawResult.map(s => {
                const centroidGeo = parseGeo(s.centroid);
                const locationGeo = parseGeo(s.location);

                // Use Centroid for visuals if available, otherwise fallback to location
                // But generally for 'area' we expect it to exist.
                // The user wants the ICON at the centroid.

                return {
                    type: 'Feature',
                    properties: {
                        id: s.id,
                        name: s.name,
                        type: s.type,
                        address: s.address,
                        description: s.description,
                        routingLocation: locationGeo, // SEND ORIGINAL LOCATION FOR ROUTING
                        routeIds: s.route_ids ? s.route_ids.split(',').map(Number) : [] // ✅ NEW: Routes serving this school
                    },
                    geometry: centroidGeo || locationGeo // Visual location
                };
            })
        };

        // B. School Areas (Polygons)
        const schoolAreasGeoJSON = {
            type: 'FeatureCollection',
            features: schoolsRawResult.map(s => ({
                type: 'Feature',
                properties: { schoolId: s.id, name: s.name, type: 'SchoolArea' },
                geometry: parseGeo(s.area)
            }))
        };

        // C. Fetch Bus Stops + Their Associated Routes
        const busStopsRaw = await prisma.$queryRaw`
            SELECT bs.id, bs.name, bs.address, bs.description,
            ST_AsGeoJSON(bs.location) as location,
            ST_AsGeoJSON(bs.area) as area,
            GROUP_CONCAT(brtbs.A) as route_ids
            FROM bus_stops bs
            LEFT JOIN _BusRouteToBusStop brtbs ON bs.id = brtbs.B
            GROUP BY bs.id
        `;

        // C1. Bus Stops (Points with Route IDs)
        const busStopsGeoJSON = {
            type: 'FeatureCollection',
            features: busStopsRaw.map(b => ({
                type: 'Feature',
                properties: {
                    id: b.id,
                    name: b.name,
                    address: b.address,
                    type: 'BusStop',
                    routeIds: b.route_ids ? b.route_ids.split(',').map(Number) : [] // Array of route IDs
                },
                geometry: parseGeo(b.location)
            }))
        };

        // D. Bus Stop Areas (Polygons)
        const busStopAreasGeoJSON = {
            type: 'FeatureCollection',
            features: busStopsRaw.map(b => ({
                type: 'Feature',
                properties: { stopId: b.id, name: b.name, type: 'BusStopArea' },
                geometry: parseGeo(b.area)
            }))
        };

        // E. Bus Routes (Lines)
        const busRoutesGeoJSON = {
            type: 'FeatureCollection',
            features: busRoutes.map(r => ({
                type: 'Feature',
                properties: {
                    id: r.id,
                    name: r.name,
                    color: r.color,
                    description: r.description,
                    schedule: r.schedule
                },
                geometry: r.pathData // Already JSON
            }))
        };

        res.json({
            schools: schoolsGeoJSON,
            schoolAreas: schoolAreasGeoJSON,
            busStops: busStopsGeoJSON,
            busStopAreas: busStopAreasGeoJSON,
            busRoutes: busRoutesGeoJSON
        });

    } catch (error) {
        console.error('Error fetching GIS data:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Endpoint 2: PROXY to OpenRouteService (ORS)
// ... existing code ...

// Endpoint X: Get Road Network (Jalan Raya) from Overpass API
app.get('/api/roads', async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const CACHE_FILE = path.join(__dirname, '../roads.cache.json');
    const SEED_FILE = path.join(__dirname, '../../jalan_bontang.geojson'); // Fallback file

    // 1. Try to serve from Cache
    if (fs.existsSync(CACHE_FILE)) {
        console.log("Serving roads from local cache...");
        try {
            const cacheData = fs.readFileSync(CACHE_FILE, 'utf8');
            return res.json(JSON.parse(cacheData));
        } catch (error) {
            console.error("Error reading cache file:", error);
            // Continue to fetch if cache read fails
        }
    }

    try {
        // Bontang BBox (approximate)
        // south,west,north,east
        const bbox = '0.08,117.43,0.18,117.55';
        const query = `
            [out:json][timeout:25];
            (
              way["highway"](${bbox});
            );
            out geom;
        `;

        console.log("Fetching roads from Overpass API...");
        // Use POST with form-urlencoded body for better reliability
        const response = await axios.post(
            'https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(query)}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'User-Agent': 'EduRouteStudentProject/1.0 (mxk_student@university.ac.id)' // Politeness Policy
                },
                timeout: 10000 // 10s timeout
            }
        );

        // Convert Overpass JSON to Simple GeoJSON-like structure for Frontend
        const features = response.data.elements.map(element => {
            if (element.type === 'way' && element.geometry) {
                return {
                    type: 'Feature',
                    properties: element.tags || {},
                    geometry: {
                        type: 'LineString',
                        coordinates: element.geometry.map(p => [p.lon, p.lat])
                    }
                };
            }
            return null;
        }).filter(f => f !== null);

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        console.log(`Fetched ${features.length} road segments from API.`);

        // Save to Cache
        fs.writeFileSync(CACHE_FILE, JSON.stringify(geojson));
        console.log("Saved roads to cache.");

        res.json(geojson);

    } catch (error) {
        console.error("Error fetching road data from Overpass:", error.message);

        // 2. Fallback to Seed File (jalan_bontang.geojson) if API fails
        if (fs.existsSync(SEED_FILE)) {
            console.log("API Failed. Serving from local SEED file (jalan_bontang.geojson)...");
            try {
                const seedData = fs.readFileSync(SEED_FILE, 'utf8');
                // Optionally write this to cache so next time it's faster?
                // fs.writeFileSync(CACHE_FILE, seedData); 
                return res.json(JSON.parse(seedData));
            } catch (seedError) {
                console.error("Error reading seed file:", seedError);
            }
        }

        res.status(500).json({ error: 'Failed to fetch road data from external API and no local cache available.' });
    }
});

app.post('/api/ors/directions', async (req, res) => {
    const { startLat, startLon, endLat, endLon, preference = 'recommended', profile = 'driving-car' } = req.body;
    // profile: 'driving-car', 'cycling-regular', 'foot-walking'

    if (!startLat || !startLon || !endLat || !endLon) {
        return res.status(400).json({
            success: false,
            message: 'Missing coordinates (startLat, startLon, endLat, endLon)',
        });
    }

    if (!ORS_API_KEY) {
        console.error('ORS_API_KEY is missing in .env');
        return res.status(500).json({
            success: false,
            message: 'Server configuration error (API Key missing)',
        });
    }

    try {
        // Construct URL based on profile
        const orsUrl = `https://api.openrouteservice.org/v2/directions/${profile}`;

        const response = await axios.get(
            orsUrl,
            {
                params: {
                    api_key: ORS_API_KEY,
                    start: `${startLon},${startLat}`,
                    end: `${endLon},${endLat}`,
                    preference: preference
                },
            }
        );

        // ORS returns GeoJSON feature collection for route
        res.json(response.data);
    } catch (error) {
        console.error('Error finding path with ORS:', error.response?.data || error.message);

        const status = error.response?.status || 500;
        const message = error.response?.data?.error?.message || 'Failed to fetch route from ORS';

        res.status(status).json({
            success: false,
            message: message,
        });
    }
});

// Endpoint 3: Get all schools (simple list)
app.get('/api/schools', async (req, res) => {
    try {
        const schools = await prisma.school.findMany({
            select: {
                id: true,
                name: true,
                type: true,
                address: true,
                latitude: true,
                longitude: true,
                description: true,
            },
        });
        res.json(schools);
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Terjadi kesalahan server' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EduRoute Bontang Server berjalan di http://localhost:${PORT}`);
    console.log(`📍 API Endpoints:`);
    console.log(`   GET  /api/health          - Health check`);
    console.log(`   GET  /api/gis-data        - Get schools & zones GeoJSON`);
    console.log(`   GET  /api/roads           - Get street data (Overpass API)`);
    console.log(`   POST /api/ors/directions  - Proxy to OpenRouteService`);
    console.log(`   GET  /api/schools         - Get all schools`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
