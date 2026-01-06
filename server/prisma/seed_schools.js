const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

function getSchoolType(name) {
    const upperName = name.toUpperCase();
    if (upperName.includes('SMK')) return 'SMK';
    if (upperName.includes('SMA')) return 'SMA';
    if (upperName.includes('MA ')) return 'MA'; // Space to avoid matching substring
    if (upperName.includes('MAN ')) return 'MA';
    return 'SWASTA'; // Default or fallback
}

// Function to convert GeoJSON coordinate array [[lon, lat], ...] to WKT string "lat lon, lat lon, ..."
// Note: We swap to (lat, lon) because previous testing showed MySQL SRID 4326 expects this order here.
function coordinatesToWKT(coords) {
    return coords.map(coord => `${coord[1]} ${coord[0]}`).join(',');
}

async function main() {
    const geojsonPath = path.resolve(__dirname, '../../../sma_kota_bontang.geojson');

    if (!fs.existsSync(geojsonPath)) {
        console.error(`File not found: ${geojsonPath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(geojsonPath, 'utf-8');
    const geojson = JSON.parse(rawData);

    console.log(`Found ${geojson.features.length} schools to insert.`);

    for (const feature of geojson.features) {
        const { properties, geometry } = feature;
        const { nama } = properties;
        const schoolType = getSchoolType(nama);

        // Geometry is MultiPolygon: [ [ [lon, lat], [lon, lat], ... ] ]
        // We need to extract the first polygon's outer ring.
        // The structure for MultiPolygon coordinates is: [Polygon1, Polygon2, ...]
        // Where Polygon1 is [Ring1, Ring2, ...]
        // Where Ring1 is [[lon, lat], [lon, lat], ...]

        // We take the first polygon, first ring (outer boundary).
        if (geometry.type !== 'MultiPolygon' || !geometry.coordinates || geometry.coordinates.length === 0) {
            console.warn(`Skipping ${nama}: Invalid geometry type or empty coordinates.`);
            continue;
        }

        const firstPolygon = geometry.coordinates[0];
        const outerRing = firstPolygon[0]; // The first ring is the outer boundary

        // Format for ST_GeomFromText used in SQL for Polygon: POLYGON((lat1 lon1, lat2 lon2, ...))
        const polygonWKT = `POLYGON((${coordinatesToWKT(outerRing)}))`;

        console.log(`Inserting: ${nama} (${schoolType})`);

        try {
            await prisma.$executeRawUnsafe(`
        INSERT INTO schools (name, type, location, area, createdAt, updatedAt)
        VALUES (
          ?, 
          ?,
          ST_GeomFromText(ST_AsText(ST_Centroid(ST_GeomFromText(?))), 4326),
          ST_GeomFromText(?, 4326),
          NOW(),
          NOW()
        )
      `, nama, schoolType, polygonWKT, polygonWKT);
        } catch (error) {
            console.error(`Failed to insert ${nama}:`, error);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
