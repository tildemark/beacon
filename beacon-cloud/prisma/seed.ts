import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Create HR user
    const hrPassword = await bcrypt.hash('password123', 10);
    const hrUser = await prisma.user.upsert({
        where: { email: 'hr@test.com' },
        update: {},
        create: {
            email: 'hr@test.com',
            password: hrPassword,
            name: 'HR Admin',
            role: 'HR',
        },
    });

    console.log('✅ HR user created:', hrUser.email);

    // Create test employee
    const empPassword = await bcrypt.hash('password123', 10);
    const employee = await prisma.user.upsert({
        where: { email: 'employee@test.com' },
        update: {},
        create: {
            email: 'employee@test.com',
            password: empPassword,
            name: 'Test Employee',
            role: 'EMPLOYEE',
        },
    });

    console.log('✅ Employee user created:', employee.email);

    console.log('\n🎉 Seed complete! You can now login with:');
    console.log('HR: hr@test.com / password123');
    console.log('Employee: employee@test.com / password123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
