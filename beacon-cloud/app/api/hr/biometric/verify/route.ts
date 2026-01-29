import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const verifySchema = z.object({
    biometricId: z.number().int(),
    deviceIp: z.string().min(7),
});

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = verifySchema.parse(body);

        // Call enrollment service to verify
        const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:8001';

        const response = await fetch(`${enrollmentServiceUrl}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                biometric_id: validated.biometricId,
                device_ip: validated.deviceIp,
            }),
        });

        const data = await response.json();

        if (response.ok && data.enrolled) {
            // Update user with fingerprint template
            await prisma.user.update({
                where: { biometricId: validated.biometricId },
                data: {
                    fingerprintTemplate: data.fingerprint_template,
                    fingerprintEnrolled: true,
                    enrolledAt: new Date(),
                    enrolledById: session.user.id,
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Fingerprint verified and template retrieved',
            });
        } else {
            return NextResponse.json({
                success: false,
                message: data.message || 'Fingerprint not enrolled on device',
            }, { status: 400 });
        }
    } catch (error) {
        console.error('Error verifying enrollment:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
