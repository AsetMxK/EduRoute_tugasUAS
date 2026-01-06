const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
    const geojsonPath = path.resolve(__dirname, '../../../titik_sma_kota_bontang.geojson');

    if (!fs.existsSync(geojsonPath)) {
        console.error(`File not found: ${geojsonPath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(geojsonPath, 'utf-8');
    const geojson = JSON.parse(rawData);

    console.log(`Found ${geojson.features.length} points to update.`);

    for (const feature of geojson.features) {
        const { properties, geometry } = feature;
        const { nama } = properties;
        const [longitude, latitude] = geometry.coordinates;

        console.log(`Updating location for: ${nama}`);

        try {
            // Update existing school location.
            // We use raw query because of Unsupported("POINT")
            // Coordinate order: POINT(lat lon) for MySQL SRID 4326 as verified previously.
            const result = await prisma.$executeRawUnsafe(`
        UPDATE schools 
        SET 
          location = ST_GeomFromText(?, 4326),
          updatedAt = NOW()
        WHERE name = ?
      `, `POINT(${latitude} ${longitude})`, nama); // Note: lat first, then long

            if (result > 0) {
                console.log(`Successfully updated ${nama}`);
            } else {
                console.warn(`School not found to update: ${nama}`);
            }

        } catch (error) {
            console.error(`Failed to update ${nama}:`, error);
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
