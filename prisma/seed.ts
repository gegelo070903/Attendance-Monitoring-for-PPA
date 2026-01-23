import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ppa.gov.ph' },
    update: {},
    create: {
      email: 'admin@ppa.gov.ph',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      department: 'Administration',
      position: 'System Administrator',
    },
  });

  // Create employee user - John Angelo D. Vasquez
  const employeePassword = await bcrypt.hash('password123', 10);
  const employee = await prisma.user.upsert({
    where: { email: 'vasquezjohnangelod.9@gmail.com' },
    update: {},
    create: {
      email: 'vasquezjohnangelod.9@gmail.com',
      name: 'John Angelo D. Vasquez',
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
      amStartTime: '08:00',
      amEndTime: '12:00',
      pmStartTime: '13:00',
      pmEndTime: '17:00',
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
