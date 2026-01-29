import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const invalidLogRequestSchema = z.object({
    log_id: z.number(),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requests = await prisma.invalidLogRequest.findMany({
            where: { user_id: session.user.id },
            include: {
                log: {
                    include: {
                        node: {
                            select: { name: true },
                        },
                    },
                },
                reviewer: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Error fetching invalid log requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const validated = invalidLogRequestSchema.parse(body);

        // Verify the log belongs to the user
        const log = await prisma.attendanceLog.findUnique({
            where: { id: validated.log_id },
        });

        if (!log || log.user_id !== session.user.id) {
            return NextResponse.json({ error: 'Log not found' }, { status: 404 });
        }

        const request = await prisma.invalidLogRequest.create({
            data: {
                user_id: session.user.id,
                log_id: validated.log_id,
                reason: validated.reason,
            },
            include: {
                log: {
                    include: {
                        node: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json({ request }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Error creating invalid log request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
