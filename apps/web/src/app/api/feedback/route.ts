export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { z, ZodError } from 'zod';

const MAX_SIZE = 100 * 1024; // 100KB

const answerSchema = z.object({
  style: z.string().max(1000),
  lookFeel: z.string().max(1000),
  understanding: z.string().max(1000),
  other: z.string().max(1000)
});

const feedbackSchema = z.record(z.string().url(), answerSchema);

export async function POST(req: Request) {
  try {
    const len = Number(req.headers.get('content-length') ?? '0');
    if (len > MAX_SIZE) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }

    const json = await req.json();
    const data = feedbackSchema.parse(json);

    const dir = path.join(process.cwd(), 'feedback');
    await fs.mkdir(dir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(dir, `${timestamp}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    const status = err instanceof ZodError ? 400 : 500;
    const message = err instanceof ZodError ? 'Invalid feedback format' : 'Failed to save feedback';
    return NextResponse.json({ error: message }, { status });
  }
}
