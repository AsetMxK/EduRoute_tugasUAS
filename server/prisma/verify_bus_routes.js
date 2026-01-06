const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Verifying Bus Routes ---');
    const routes = await prisma.busRoute.findMany();
    console.log(`Total Routes: ${routes.length}`);
    routes.forEach(r => {
        console.log(`[${r.id}] ${r.name} - Color: ${r.color}`);
        // console.log(`Path Data Length: ${JSON.stringify(r.pathData).length}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
