const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRoles() {
  const users = await prisma.user.findMany({
    select: { 
      email: true, 
      name: true, 
      role: true 
    }
  });
  
  console.log('User roles:');
  users.forEach(u => {
    console.log(`  ${u.email} - ${u.name} - Role: ${u.role}`);
  });
  
  await prisma.$disconnect();
}

checkRoles();
