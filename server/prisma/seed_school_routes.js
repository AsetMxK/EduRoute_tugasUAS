const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔗 Seeding School-BusRoute Relationships...');

    // Define which bus routes serve which schools
    // Adjust these IDs based on your actual data
    const relationships = [
        {
            routeId: 1, // Example: Rute Monamas A
            schoolIds: [1, 2] // Example: Ser school IDs 1 (SMA Monamas) and 2 (SMP Monamas)
        },
        // Add more relationships as needed
        // {
        //     routeId: 2,
        //     schoolIds: [3, 4]
        // }
    ];

    for (const rel of relationships) {
        try {
            await prisma.busRoute.update({
                where: { id: rel.routeId },
                data: {
                    schools: {
                        connect: rel.schoolIds.map(id => ({ id }))
                    }
                }
            });
            console.log(`✅ Route ${rel.routeId} connected to schools: ${rel.schoolIds.join(', ')}`);
        } catch (error) {
            console.error(`❌ Error connecting Route ${rel.routeId}:`, error.message);
        }
    }

    console.log('✅ School-BusRoute relationships seeded!');
}

main()
    .catch((e) => {
        console.error('Error seeding relationships:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
