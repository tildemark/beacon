import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reviewSchema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    type: z.enum(['invalid', 'manual']),
});

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = reviewSchema.parse(body);
        const { id } = params;

        const updateData = {
            status: validated.status,
            reviewedAt: new Date(),
            reviewer_id: session.user.id,
        };

        let request;

        if (validated.type === 'invalid') {
            request = await prisma.invalidLogRequest.update({
                where: { id },
                data: updateData,
                include: {
                    user: {
                        select: { name: true, email: true },
                    },
                    log: {
                        include: {
                            node: {
                                select: { name: true },
                            },
                        },
                    },
                },
            });
        } else {
            request = await prisma.manualLogRequest.update({
                where: { id },
                data: updateData,
                include: {
                    user: {
                        select: { name: true, email: true },
                    },
                    node: {
                        select: { name: true, type: true },
                    },
                },
            });

            // If approved, create the attendance log
            if (validated.status === 'APPROVED') {
                await prisma.attendanceLog.create({
                    data: {
                        user_id: request.user_id,
                        timestamp: request.timestamp,
                        node_id: request.node_id,
                    },
                });
            }
        }

        return NextResponse.json({ request });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Error reviewing request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
