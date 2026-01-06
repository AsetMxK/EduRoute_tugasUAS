const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive seeding...\n');

  // ===== 1. LOAD GEOJSON FILES =====
  const busStopsPath = path.resolve(__dirname, 'data/titik halte.geojson');
  const schoolPointsPath = path.resolve(__dirname, 'data/titik_sma_kota_bontang.geojson');
  const schoolAreasPath = path.resolve(__dirname, 'data/sma_kota_bontang.geojson');
  const routesPath = path.resolve(__dirname, 'data/rute_bus.geojson');

  const busStopsData = JSON.parse(fs.readFileSync(busStopsPath, 'utf-8'));
  const schoolPointsData = JSON.parse(fs.readFileSync(schoolPointsPath, 'utf-8'));
  const schoolAreasData = JSON.parse(fs.readFileSync(schoolAreasPath, 'utf-8'));
  const routesData = JSON.parse(fs.readFileSync(routesPath, 'utf-8'));

  console.log(`📍 Loaded ${busStopsData.features.length} bus stops`);
  console.log(`🏫 Loaded ${schoolPointsData.features.length} school points`);
  console.log(`📐 Loaded ${schoolAreasData.features.length} school areas`);
  console.log(`🚌 Loaded ${routesData.features.length} bus routes\n`);

  // ===== 2. CLEAR EXISTING DATA =====
  console.log('🗑️  Clearing existing data...');
  await prisma.$executeRaw`DELETE FROM _BusRouteToBusStop`;
  await prisma.$executeRaw`DELETE FROM _BusRouteToSchool`;
  await prisma.$executeRaw`DELETE FROM bus_stops`;
  await prisma.$executeRaw`DELETE FROM bus_routes`;
  await prisma.$executeRaw`DELETE FROM schools`;
  console.log('✅ Cleared!\n');

  // ===== 3. SEED SCHOOLS =====
  console.log('🏫 Seeding schools...');
  const schoolIdMap = {}; // Maps GeoJSON ID to DB ID

  for (const pointFeature of schoolPointsData.features) {
    const { id: geojsonId, nama } = pointFeature.properties;
    const [longitude, latitude] = pointFeature.geometry.coordinates;

    // Find matching area polygon
    const areaFeature = schoolAreasData.features.find(f => f.properties.id === geojsonId);
    let areaWKT = `POLYGON((${latitude} ${longitude}, ${latitude + 0.0001} ${longitude}, ${latitude + 0.0001} ${longitude + 0.0001}, ${latitude} ${longitude + 0.0001}, ${latitude} ${longitude}))`;

    if (areaFeature && areaFeature.geometry) {
      const geom = areaFeature.geometry;

      if (geom.type === 'Polygon') {
        // Convert GeoJSON Polygon to WKT (swap lon/lat to lat/lon for MySQL SRID 4326)
        const coords = geom.coordinates[0];
        const wktCoords = coords.map(c => `${c[1]} ${c[0]}`).join(', ');
        areaWKT = `POLYGON((${wktCoords}))`;
      } else if (geom.type === 'MultiPolygon') {
        // Take the first polygon from MultiPolygon
        const coords = geom.coordinates[0][0]; // [0][0] = first polygon, first ring
        const wktCoords = coords.map(c => `${c[1]} ${c[0]}`).join(', ');
        areaWKT = `POLYGON((${wktCoords}))`;
      }
    }

    try {
      const result = await prisma.$executeRaw`
                INSERT INTO schools (name, type, location, area, createdAt, updatedAt)
                VALUES (
                    ${nama},
                    'SMA',
                    ST_GeomFromText(${`POINT(${latitude} ${longitude})`}, 4326),
                    ST_GeomFromText(${areaWKT}, 4326),
                    NOW(),
                    NOW()
                )
            `;

      // Get the auto-incremented ID
      const inserted = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as id`;
      const dbId = Number(inserted[0].id);
      schoolIdMap[geojsonId] = dbId;

      console.log(`  ✅ ${nama} (GeoJSON ID: ${geojsonId} → DB ID: ${dbId})`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${nama}:`, error.message);
    }
  }

  console.log(`\n✅ Seeded ${Object.keys(schoolIdMap).length} schools\n`);

  // ===== 4. SEED BUS STOPS =====
  console.log('🚏 Seeding bus stops...');
  const busStopIdMap = {}; // Maps GeoJSON ID to DB ID

  for (const feature of busStopsData.features) {
    const { id: geojsonId, nama_halte } = feature.properties;
    const [longitude, latitude] = feature.geometry.coordinates;

    try {
      await prisma.$executeRaw`
                INSERT INTO bus_stops (name, location, area, createdAt, updatedAt)
                VALUES (
                    ${nama_halte},
                    ST_GeomFromText(${`POINT(${latitude} ${longitude})`}, 4326),
                    ST_Buffer(ST_GeomFromText(${`POINT(${latitude} ${longitude})`}, 4326), 0.0001),
                    NOW(),
                    NOW()
                )
            `;

      const inserted = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as id`;
      const dbId = Number(inserted[0].id);
      busStopIdMap[geojsonId] = dbId;

      console.log(`  ✅ ${nama_halte} (GeoJSON ID: ${geojsonId} → DB ID: ${dbId})`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${nama_halte}:`, error.message);
    }
  }

  console.log(`\n✅ Seeded ${Object.keys(busStopIdMap).length} bus stops\n`);

  // ===== 5. SEED BUS ROUTES =====
  console.log('🚌 Seeding bus routes...');
  const routeIdMap = {}; // Maps GeoJSON ID to DB ID

  for (const feature of routesData.features) {
    const { id: geojsonId, name, color } = feature.properties;
    const pathDataJson = JSON.stringify(feature.geometry);

    try {
      await prisma.$executeRaw`
                INSERT INTO bus_routes (name, color, pathData, createdAt, updatedAt)
                VALUES (
                    ${name || `Rute Bus ${geojsonId}`},
                    ${color || '#FF0000'},
                    ${pathDataJson},
                    NOW(),
                    NOW()
                )
            `;

      const inserted = await prisma.$queryRaw`SELECT LAST_INSERT_ID() as id`;
      const dbId = Number(inserted[0].id);
      routeIdMap[geojsonId] = dbId;

      console.log(`  ✅ ${name} (GeoJSON ID: ${geojsonId} → DB ID: ${dbId})`);
    } catch (error) {
      console.error(`  ❌ Failed to insert ${name}:`, error.message);
    }
  }

  console.log(`\n✅ Seeded ${Object.keys(routeIdMap).length} bus routes\n`);

  // ===== 6. ESTABLISH RELATIONSHIPS =====
  console.log('🔗 Establishing relationships...\n');

  // Helper function to get DB ID from name
  const getSchoolDbId = (name) => {
    const found = Object.entries(schoolIdMap).find(([geoId, dbId]) => {
      const school = schoolPointsData.features.find(f => f.properties.id === Number(geoId));
      return school && school.properties.nama === name;
    });
    return found ? found[1] : null;
  };

  const getBusStopDbId = (name) => {
    const found = Object.entries(busStopIdMap).find(([geoId, dbId]) => {
      const stop = busStopsData.features.find(f => f.properties.id === Number(geoId));
      return stop && stop.properties.nama_halte === name;
    });
    return found ? found[1] : null;
  };

  // Define relationships based on user's mapping
  const relationships = [
    {
      routeGeoId: 1,
      halte: [
        'Halte Perhubungan',
        'Halte Citra Mas',
        'Halte Nabilla',
        'Halte SMP Negeri 5',
        'Halte KPI',
        'Halte Kayu Mas',
        'Halte SMA Negeri 3',
        'Halte SMK Negeri I',
        'Halte Jalan Tembus II',
        'Halte Jalan Tembus I',
        'Halte Yabis'
      ],
      sekolah: ['SMA 3', 'SMA Yabis', 'SMA YPK']
    },
    {
      routeGeoId: 2,
      halte: [
        'Halte SMP Negeri 2',
        'Halte SMA Monamas',
        'Halte Rigomasi'
      ],
      sekolah: ['SMA 1', 'SMA Monamas', 'SMA 2']
    },
    {
      routeGeoId: 3,
      halte: [
        'Halte HOP I',
        'Halte HOP II',
        'Halte HOP V',
        'Halte Amplang HOP V',
        'Halte Awang Long Indah',
        'Halte HOP VI',
        'Halte Yabis',
        'Halte Terminal'
      ],
      sekolah: ['SMA Vidatra', 'SMA Yabis']
    },
    {
      routeGeoId: 4,
      halte: [
        'Halte Terminal',
        'Halte Yabis',
        'Halte Jalan Tembus I',
        'Halte Bahrul Ulum',
        'Halte Yamaha'
      ],
      sekolah: ['SMA 1', 'SMA Bahrul Ulum', 'SMA Yabis']
    },
    {
      routeGeoId: 5,
      halte: [
        'Halte SMP Negeri 2',
        'Halte Rigomasi',
        'Halte SMA Monamas'
      ],
      sekolah: ['SMA 2', 'SMA Monamas']
    }
  ];

  // Connect Routes to Bus Stops and Schools
  for (const rel of relationships) {
    const routeDbId = routeIdMap[rel.routeGeoId];
    if (!routeDbId) {
      console.error(`❌ Route ID ${rel.routeGeoId} not found in DB`);
      continue;
    }

    console.log(`\n🔗 Connecting Route ${rel.routeGeoId} (DB ID: ${routeDbId})...`);

    // Connect to Bus Stops
    for (const halteName of rel.halte) {
      const stopDbId = getBusStopDbId(halteName);
      if (stopDbId) {
        try {
          await prisma.$executeRaw`
                        INSERT INTO _BusRouteToBusStop (A, B)
                        VALUES (${routeDbId}, ${stopDbId})
                    `;
          console.log(`  ✅ Stop: ${halteName}`);
        } catch (error) {
          console.error(`  ❌ Failed to connect ${halteName}:`, error.message);
        }
      } else {
        console.warn(`  ⚠️  Stop not found: ${halteName}`);
      }
    }

    // Connect to Schools
    for (const schoolName of rel.sekolah) {
      const schoolDbId = getSchoolDbId(schoolName);
      if (schoolDbId) {
        try {
          await prisma.$executeRaw`
                        INSERT INTO _BusRouteToSchool (A, B)
                        VALUES (${routeDbId}, ${schoolDbId})
                    `;
          console.log(`  ✅ School: ${schoolName}`);
        } catch (error) {
          console.error(`  ❌ Failed to connect ${schoolName}:`, error.message);
        }
      } else {
        console.warn(`  ⚠️  School not found: ${schoolName}`);
      }
    }
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('💥 Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
