import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ ip: string }> }
) {
    const params = await props.params;
    const { ip } = params;
    // Decode IP if it was URL encoded (though usually nextjs handles params well)
    // But since it's in a path like .../devices/192.168.1.196/users, it's fine.

    const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://127.0.0.1:8001';

    try {
        console.log(`[GET_DEVICE_USERS] Fetching from ${enrollmentServiceUrl}/users/${ip}`);
        const response = await fetch(`${enrollmentServiceUrl}/users/${ip}`, {
            method: 'GET',
            cache: 'no-store'
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Service returned ${response.status}: ${errText}`);
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error: any) {
        console.error('[GET_DEVICE_USERS] Error:', error);
        // Expose the actual error message for debugging
        return NextResponse.json(
            { error: `Failed to fetch users: ${error.message}` },
            { status: 500 }
        );
    }
}
