import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const enrollSchema = z.object({
    deviceIp: z.string().min(7),
    biometricId: z.number().int().min(1).max(9999).optional(),
});

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const body = await req.json();
        const validated = enrollSchema.parse(body);
        const { id } = await params;

        // Get employee
        const employee = await prisma.user.findUnique({
            where: { id },
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        // Auto-assign biometric ID if not provided
        let biometricId = validated.biometricId;

        if (!biometricId) {
            // Query the device to find the next available ID
            const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:8001';
            const deviceIp = validated.deviceIp || process.env.DEVICE_IP || '192.168.1.196';

            try {
                // Fetch users from device via Python service
                const usersResponse = await fetch(`${enrollmentServiceUrl}/users/${deviceIp}`);
                let deviceUsedIds: number[] = [];

                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    deviceUsedIds = (usersData.users || []).map((u: any) => parseInt(u.uid));
                } else {
                    console.warn(`[ENROLL] Failed to fetch existing users from device: ${usersResponse.statusText}`);
                }

                // Get all used biometric IDs from database
                const dbUsers = await prisma.user.findMany({
                    where: { biometricId: { not: null } },
                    select: { biometricId: true },
                });

                const dbUsedIds = dbUsers.map(u => u.biometricId!);

                // Combine used IDs
                const usedIds = new Set([...dbUsedIds, ...deviceUsedIds]);

                // Find next available ID starting from 1
                for (let id = 1; id <= 9999; id++) {
                    if (!usedIds.has(id)) {
                        biometricId = id;
                        break;
                    }
                }

                if (!biometricId) {
                    return NextResponse.json({
                        error: 'No available biometric IDs (1-9999 all used)'
                    }, { status: 400 });
                }

                console.log(`[ENROLL] Auto-assigned biometric ID: ${biometricId} (checked device and database)`);

            } catch (error) {
                console.error('[ENROLL] Error checking device users, falling back to database-only check:', error);

                // Fallback: check database only
                const maxId = await prisma.user.findFirst({
                    where: { biometricId: { not: null } },
                    orderBy: { biometricId: 'desc' },
                    select: { biometricId: true },
                });
                biometricId = (maxId?.biometricId ?? 0) + 1;

                console.log(`[ENROLL] Auto-assigned biometric ID: ${biometricId} (database only - device check failed)`);
            }
        }

        // Final safety check: if biometric ID is already in use in database
        // (Should be covered by above logic, but good for explicit validation/concurrency safety)
        const existing = await prisma.user.findUnique({
            where: { biometricId },
        });

        if (existing && existing.id !== id) {
            // If we somehow picked a used ID (race condition or fallback failure), try one more time or fail
            if (!validated.biometricId) {
                // It was auto-assigned but collided. Try next one? 
                // For simplicity, let's just fail and ask user to try again or rely on unique constraint
                return NextResponse.json({
                    error: `Auto-assigned Biometric ID ${biometricId} is valid on device but already linked to ${existing.name} in DB. Please try again.`
                }, { status: 409 });
            }

            return NextResponse.json({
                error: `Biometric ID ${biometricId} is already in use by ${existing.name}`
            }, { status: 400 });
        }

        // Call Python enrollment service for actual device enrollment
        const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://localhost:8001';

        try {
            const enrollResponse = await fetch(`${enrollmentServiceUrl}/enroll`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    biometric_id: biometricId,
                    name: employee.name,
                    device_ip: validated.deviceIp,
                }),
            });

            if (!enrollResponse.ok) {
                const errorData = await enrollResponse.json();
                throw new Error(errorData.detail || 'Enrollment service failed');
            }

            const enrollData = await enrollResponse.json();
            const fingerprintTemplate = enrollData.fingerprint_template;

            if (fingerprintTemplate) {
                // Template retrieved - save it
                const updatedUser = await prisma.user.update({
                    where: { id },
                    data: {
                        biometricId,
                        fingerprintTemplate,
                        fingerprintEnrolled: true,
                        enrolledAt: new Date(),
                        enrolledById: session.user.id,
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        biometricId: true,
                        fingerprintEnrolled: true,
                        enrolledAt: true,
                    },
                });

                return NextResponse.json({
                    success: true,
                    employee: updatedUser,
                    message: enrollData.message,
                });
            } else {
                // User created but needs manual enrollment
                // Save biometric ID but mark as not enrolled yet
                const updatedUser = await prisma.user.update({
                    where: { id },
                    data: {
                        biometricId,
                        fingerprintEnrolled: false,  // Not enrolled yet
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        biometricId: true,
                        fingerprintEnrolled: true,
                        enrolledAt: true,
                    },
                });

                return NextResponse.json({
                    success: true,
                    employee: updatedUser,
                    message: enrollData.message,
                    instructions: enrollData.instructions,
                    needsManualEnrollment: true,
                });
            }
        } catch (enrollError: any) {
            console.error('Enrollment service error:', enrollError);
            return NextResponse.json({
                error: `Enrollment failed: ${enrollError.message}`
            }, { status: 500 });
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }
        console.error('Error enrolling fingerprint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// Get enrollment status
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { id } = await params;

        const employee = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                biometricId: true,
                fingerprintEnrolled: true,
                enrolledAt: true,
                enrolledBy: {
                    select: {
                        name: true,
                        role: true,
                    },
                },
            },
        });

        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        return NextResponse.json({ employee });
    } catch (error) {
        console.error('Error fetching enrollment status:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
