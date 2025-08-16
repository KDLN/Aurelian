export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: Request) {
  const data = await req.json();
  const dir = path.join(process.cwd(), 'feedback');
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(dir, `${timestamp}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  return NextResponse.json({ ok: true });
}
