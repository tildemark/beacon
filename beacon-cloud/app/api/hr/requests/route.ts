import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';
    const type = searchParams.get('type'); // 'invalid' or 'manual'
    const employeeId = searchParams.get('employeeId');

    try {
        const where: any = { status };
        if (employeeId) where.user_id = employeeId;

        let invalidRequests = [];
        let manualRequests = [];

        if (!type || type === 'invalid') {
            invalidRequests = await prisma.invalidLogRequest.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
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
        }

        if (!type || type === 'manual') {
            manualRequests = await prisma.manualLogRequest.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true },
                    },
                    node: {
                        select: { name: true, type: true },
                    },
                    reviewer: {
                        select: { name: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
        }

        return NextResponse.json({
            invalidRequests,
            manualRequests,
            total: invalidRequests.length + manualRequests.length,
        });
    } catch (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
