import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const createEmployeeSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(['EMPLOYEE', 'HR', 'IT']).optional(),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const role = searchParams.get('role');

    try {
        const where: any = {};

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (role) {
            where.role = role;
        }

        const employees = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                biometricId: true,
                fingerprintEnrolled: true,
                enrolledAt: true,
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json({ employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = createEmployeeSchema.parse(body);

        // Check if email already exists
        const existing = await prisma.user.findUnique({
            where: { email: validated.email },
        });

        if (existing) {
            return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validated.password, 10);

        const employee = await prisma.user.create({
            data: {
                email: validated.email,
                password: hashedPassword,
                name: validated.name,
                role: validated.role || 'EMPLOYEE',
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        return NextResponse.json({ employee }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error('Error creating employee:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
