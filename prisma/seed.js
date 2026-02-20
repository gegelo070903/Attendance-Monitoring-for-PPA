const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

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
  console.log({ admin: admin.email });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Seed error:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
