import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { auth } from '~/server/better-auth';

const UPLOAD_DIR = path.join(
  process.cwd(),
  'public',
  'uploads',
  'announcements',
);
const PUBLIC_PATH_PREFIX = '/uploads/announcements';

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Görsel bulunamadı' }, { status: 400 });
  }

  const extension = ALLOWED_TYPES[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: 'Desteklenmeyen dosya türü. JPG, PNG, WEBP veya GIF yükleyin.' },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'Dosya boyutu 8MB sınırını aşıyor' },
      { status: 400 },
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return NextResponse.json({ path: `${PUBLIC_PATH_PREFIX}/${filename}` });
}
