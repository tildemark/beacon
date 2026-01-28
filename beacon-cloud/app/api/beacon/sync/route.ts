/**
 * /api/beacon/sync - Cloud API Route (Next.js)
 * --------------------------------------------------
 * - Accepts POST requests from edge nodes (LAND/SEA)
 * - Authenticates using Bearer token (provisioned per node)
 * - Accepts GZIP-compressed or plain JSON payloads (batch logs)
 * - Upserts attendance logs, updates node heartbeat/status
 * - Sets Redis key for online status (TTL: 1h for SEA, 5m for LAND)
 *
 * Implementation Notes:
 * - Prisma: Used for DB access (beaconNode, attendanceLog)
 * - Redis: Used for online status (node:{id}:online)
 * - GZIP: Use zlib to decompress if needed
 * - Error handling: Returns 401/403/400/500 as appropriate
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Redis } from '@upstash/redis';
import zlib from 'zlib';

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  // 1. Authenticate using Bearer token
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = auth.replace('Bearer ', '').trim();
  const node = await prisma.beaconNode.findUnique({ where: { token } });
  if (!node) {
    return NextResponse.json({ error: 'Invalid node token' }, { status: 403 });
  }

  // 2. Decompress if GZIP, else parse JSON
  let logs: any[] = [];
  try {
    if (req.headers.get('content-encoding') === 'gzip') {
      const buf = Buffer.from(await req.arrayBuffer());
      const decompressed = zlib.gunzipSync(buf).toString();
      logs = JSON.parse(decompressed);
    } else {
      logs = await req.json();
    }
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  if (!Array.isArray(logs)) {
    return NextResponse.json({ error: 'Payload must be array' }, { status: 400 });
  }

  // 3. Upsert logs and update node heartbeat/status
  try {
    await prisma.attendanceLog.createMany({
      data: logs.map(log => ({
        user_id: log.user_id,
        timestamp: new Date(log.timestamp),
        node_id: node.id,
      })),
      skipDuplicates: true,
    });
    await prisma.beaconNode.update({
      where: { id: node.id },
      data: { last_heartbeat: new Date(), status: 'online' },
    });
    // 4. Set Redis key for online status (SEA: 1h, LAND: 5m)
    const ttl = node.type === 'SEA' ? 3600 : 300;
    await redis.set(`node:${node.id}:online`, true, { ex: ttl });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
