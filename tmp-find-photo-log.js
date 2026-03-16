const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const target = '/api/files/cmmsw6qj8000csdy77a0z93wa';
  const logs = await prisma.activityLog.findMany({
    where: { scanPhoto: target },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      userName: true,
      action: true,
      description: true,
      scanPhoto: true,
      createdAt: true,
    },
  });
  console.log(JSON.stringify(logs, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
