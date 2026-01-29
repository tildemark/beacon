import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// This endpoint is called by edge nodes to sync enrolled users
export async function GET(req: NextRequest) {
    // In production, you should authenticate edge nodes using their tokens
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');

    // For now, we'll allow any request (you should validate the node token)
    // const node = await prisma.beaconNode.findUnique({ where: { token } });
    // if (!node) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Get all enrolled users
        const users = await prisma.user.findMany({
            where: {
                fingerprintEnrolled: true,
                biometricId: { not: null },
            },
            select: {
                id: true,
                biometricId: true,
                name: true,
                email: true,
                fingerprintTemplate: true,
                enrolledAt: true,
            },
            orderBy: { biometricId: 'asc' },
        });

        return NextResponse.json({
            users,
            total: users.length,
            syncedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Error syncing users:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
