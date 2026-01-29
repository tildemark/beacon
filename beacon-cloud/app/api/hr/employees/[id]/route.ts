import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    role: z.enum(['EMPLOYEE', 'HR', 'IT']).optional(),
    biometricId: z.number().int().optional().nullable(),
    fingerprintEnrolled: z.boolean().optional(),
    enrolledAt: z.string().datetime().optional().nullable(),
});

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = params;

        const employee = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                logs: {
                    take: 10,
                    orderBy: { timestamp: 'desc' },
                    include: {
                        node: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json({ employee });
    } catch (error) {
        console.error('Error fetching employee:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = updateEmployeeSchema.parse(body);
        const { id } = params;

        // If simple profile update, just update
        let data: any = { ...validated };

        // If enrolling/linking, track who did it
        if (validated.fingerprintEnrolled === true) {
            data.enrolledById = session.user.id;
            if (!data.enrolledAt) {
                data.enrolledAt = new Date();
            }
        }

        const employee = await prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
        });

        return NextResponse.json({ employee });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error('Error updating employee:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
