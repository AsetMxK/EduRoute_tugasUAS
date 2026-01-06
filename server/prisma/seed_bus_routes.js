const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const GEOJSON_PATH = path.join(__dirname, '../../../rute_bus.geojson');

async function main() {
    console.log('--- Seeding Bus Routes ---');

    // 1. Read GeoJSON
    console.log(`Reading GeoJSON from: ${GEOJSON_PATH}`);
    const rawData = fs.readFileSync(GEOJSON_PATH, 'utf8');
    const geojson = JSON.parse(rawData);

    // 2. Clear existing routes
    console.log('Clearing existing BusRoute data...');
    // We might need to delete related BusStops relations first if they exist, but schema says implicit m-n or 1-n?
    // checking schema: BusStop has `generatedRoutes BusRoute[]`. It's a many-to-many implicit or explicit.
    // If implicit, `deleteMany` on BusRoute should cascade or just handle it. 
    // Usually standard deleteMany is fine unless strict FK constraints prevent it without cascade.
    // Let's try deleteMany.
    await prisma.busRoute.deleteMany({});

    // 3. Process Features
    console.log(`Found ${geojson.features.length} features.`);

    const predefinedColors = [
        '#FF5733', // Red-Orange
        '#33FF57', // Green
        '#3357FF', // Blue
        '#FF33F5', // Pink
        '#33FFF5', // Cyan
        '#F5FF33', // Yellow
        '#FF8C33', // Dark Orange
        '#8C33FF', // Purple
    ];

    let count = 0;
    for (const feature of geojson.features) {
        const props = feature.properties;

        // Handle Inconsistent Naming
        const name = props.name || props.nama || `Rute Bus ${props.id}`;

        // Assign Color (Cyclic)
        const color = predefinedColors[count % predefinedColors.length];

        // Prepare Geometry (GeoJSON Object)
        // Store the entire geometry object { type: 'MultiLineString', coordinates: [...] }
        const geometry = feature.geometry;

        console.log(`Processing: ${name} (ID: ${props.id})`);

        await prisma.busRoute.create({
            data: {
                name: name,
                color: color,
                pathData: geometry, // Stored as JSON
                description: `Rute Bus`
            }
        });

        count++;
    }

    console.log(`Successfully seeded ${count} bus routes.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
