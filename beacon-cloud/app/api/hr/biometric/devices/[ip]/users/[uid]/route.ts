import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Adjust path as needed
import { prisma } from '@/lib/prisma';   // Adjust path as needed

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ ip: string; uid: string }> }
) {
    const params = await props.params;
    const session = await getServerSession(authOptions);

    // 1. Auth check
    if (!session || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ip, uid } = params;
    const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://127.0.0.1:8001';

    try {
        // 2. Clear from database if exists
        // We only clear the biometricId linkage if it matches the deletion target
        // This is safe because if we delete from device, we should probably clear the linkage on DB side too
        // OR we can choose to strictly just delete from device.
        // Let's strictly delete from device, but also check if we should clear DB linkage.

        // Actually, for "reset" purposes, we often want to clear the DB linkage so they can be re-enrolled.
        // Let's find the user with this biometric ID and clear it.
        const uidInt = parseInt(uid);

        // Optional: clear from DB locally
        // await prisma.user.updateMany({
        //     where: { biometricId: uidInt },
        //     data: { biometricId: null, fingerprintTemplate: null, fingerprintEnrolled: false }
        // });

        // 3. Call Python service to delete from device
        const response = await fetch(`${enrollmentServiceUrl}/users/${ip}/${uid}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Service error: ${errorText}`);
        }

        const result = await response.json();

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[DELETE_USER] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete user' },
            { status: 500 }
        );
    }
}
