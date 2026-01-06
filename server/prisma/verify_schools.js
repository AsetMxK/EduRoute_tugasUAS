const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const count = await prisma.school.count();
    console.log(`Total Schools: ${count}`);

    const sample = await prisma.$queryRaw`
    SELECT id, name, type, ST_AsText(location) as location, ST_AsText(area) as area 
    FROM schools 
    ORDER BY id DESC
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
