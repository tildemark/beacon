import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const manualLogRequestSchema = z.object({
    timestamp: z.string(),
    node_id: z.string(),
    punch_type: z.number().min(0).max(5),
    reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const requests = await prisma.manualLogRequest.findMany({
            where: { user_id: session.user.id },
            include: {
                node: {
                    select: { name: true, type: true },
                },
                reviewer: {
                    select: { name: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error('Error fetching manual log requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const timestamp = formData.get('timestamp') as string;
        const node_id = formData.get('node_id') as string;
        const punch_type = parseInt(formData.get('punch_type') as string);
        const reason = formData.get('reason') as string;
        const proof = formData.get('proof') as File | null;

        // Validate input
        const validated = manualLogRequestSchema.parse({
            timestamp,
            node_id,
            punch_type,
            reason,
        });

        let proof_url: string | null = null;

        // Handle file upload if provided
        if (proof) {
            const bytes = await proof.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Create unique filename
            const filename = `${Date.now()}-${proof.name}`;
            const filepath = join(process.cwd(), 'public', 'uploads', filename);

            // Save file
            await writeFile(filepath, buffer);
            proof_url = `/uploads/${filename}`;
        }

        const request = await prisma.manualLogRequest.create({
            data: {
                user_id: session.user.id,
                timestamp: new Date(validated.timestamp),
                node_id: validated.node_id,
                punch_type: validated.punch_type,
                reason: validated.reason,
                proof_url,
            },
            include: {
                node: {
                    select: { name: true, type: true },
                },
            },
        });

        return NextResponse.json({ request }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Error creating manual log request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
