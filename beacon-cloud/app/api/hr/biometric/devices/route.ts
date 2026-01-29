import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mock enrollment devices - in production, this could come from database or config
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user.role !== 'HR' && session.user.role !== 'IT')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch devices from Python enrollment service
    const enrollmentServiceUrl = process.env.ENROLLMENT_SERVICE_URL || 'http://127.0.0.1:8001';

    try {
        console.log(`[DEVICES API] Fetching from ${enrollmentServiceUrl}/devices`);
        const response = await fetch(`${enrollmentServiceUrl}/devices`, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Service returned ${response.status}`);
        }

        const devices = await response.json();
        console.log('[DEVICES API] Fetched devices:', devices);
        // Python service returns array directly, wrap it in devices key
        return NextResponse.json({ devices });
    } catch (error: any) {
        console.error('Error fetching devices from enrollment service:', error.message);
        // Fallback to static list
        return NextResponse.json({
            devices: [
                { ip: process.env.DEVICE_IP || '192.168.254.199', name: 'Office Device', location: 'Direct PC Connection (Fallback)' }
            ]
        });
    }
}
