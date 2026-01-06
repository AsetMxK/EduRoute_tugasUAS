const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.busStop.count();
    console.log(`Total Bus Stops: ${count}`);

    const sample = await prisma.$queryRaw`
    SELECT id, name, ST_AsText(location) as location, ST_AsText(area) as area 
    FROM bus_stops 
    LIMIT 3
  `;
    console.log('Sample data:', sample);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
