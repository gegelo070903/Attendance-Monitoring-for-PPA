const { PrismaClient } = require('@prisma/client');

async function checkDB() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== DATABASE CHECK ===\n');
    
    // Check Users
    const users = await prisma.user.findMany();
    console.log(`Users in DB: ${users.length}`);
    users.forEach(u => console.log(`  - ${u.email} (${u.role})`));
    
    // Check Settings
    const settings = await prisma.settings.findMany();
    console.log(`\nSettings: ${settings.length > 0 ? 'Configured' : 'Not configured'}`);
    if (settings.length > 0) {
      console.log(`  - Work hours: ${settings[0].workStartTime} - ${settings[0].workEndTime}`);
      console.log(`  - Late threshold: ${settings[0].lateThreshold} minutes`);
    }
    
    // Check Attendance records
    const attendance = await prisma.attendance.findMany();
    console.log(`\nAttendance records: ${attendance.length}`);
    
    console.log('\n=== CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkDB();
