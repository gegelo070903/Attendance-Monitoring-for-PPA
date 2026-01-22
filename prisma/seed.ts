import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ppa.com' },
    update: {},
    create: {
      email: 'admin@ppa.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      department: 'Administration',
      position: 'System Administrator',
    },
  });

  // Create employee user
  const employeePassword = await bcrypt.hash('employee123', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'employee@ppa.com' },
    update: {},
    create: {
      email: 'employee@ppa.com',
      name: 'John Doe',
      password: employeePassword,
      role: 'EMPLOYEE',
      department: 'Engineering',
      position: 'Software Developer',
    },
  });

  // Create default settings
  await prisma.settings.upsert({
    where: { id: 'default-settings' },
    update: {},
    create: {
      id: 'default-settings',
      workStartTime: '09:00',
      workEndTime: '17:00',
      lateThreshold: 15,
    },
  });

  console.log('Database seeded successfully!');
  console.log({ admin, employee });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
