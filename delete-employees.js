const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteEmployees() {
  // First show who will be deleted
  const employees = await prisma.user.findMany({
    where: { role: 'EMPLOYEE' },
    select: { email: true, name: true }
  });
  
  console.log('Employees to delete:');
  employees.forEach(e => console.log(`  - ${e.name} (${e.email})`));
  
  // Delete their attendance records first
  const attendanceDeleted = await prisma.attendance.deleteMany({
    where: {
      user: {
        role: 'EMPLOYEE'
      }
    }
  });
  console.log(`Deleted ${attendanceDeleted.count} attendance records`);
  
  // Delete the employees
  const result = await prisma.user.deleteMany({
    where: { role: 'EMPLOYEE' }
  });
  
  console.log(`Deleted ${result.count} employee accounts`);
  
  // Show remaining users
  const remaining = await prisma.user.findMany({
    select: { email: true, name: true, role: true }
  });
  console.log('\nRemaining users:');
  remaining.forEach(u => console.log(`  - ${u.name} (${u.email}) - ${u.role}`));
  
  await prisma.$disconnect();
}

deleteEmployees();
