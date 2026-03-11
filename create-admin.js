const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'admin@ppa.gov.ph',
        name: 'Admin',
        password: hashedPassword,
        role: 'ADMIN',
        department: 'Administration',
        position: 'System Administrator',
        shiftType: 'DAY',
      },
    });
    console.log('Admin account created successfully!');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
  } catch (e) {
    if (e.code === 'P2002') {
      console.log('Admin account already exists with that email.');
    } else {
      console.error('Error:', e.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
