const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany({
    select: { email: true, name: true, id: true }
  });
  console.log('Users in database:');
  users.forEach(u => console.log(`  Email: ${u.email}, Name: ${u.name}`));
  await prisma.$disconnect();
}

main();
