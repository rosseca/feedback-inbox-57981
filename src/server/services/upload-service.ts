import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type AllowedUploadMimeType,
} from '@/contracts/upload';

export type UploadRejection = 'too_large' | 'unsupported_type' | 'unsafe_filename';

export function uploadsRoot(): string {
  return path.resolve(process.cwd(), 'data', 'uploads');
}

export function isUnsafeFilename(rawName: string): boolean {
  if (!rawName) {
    return true;
  }
  if (rawName.includes('..')) {
    return true;
  }
  if (rawName.includes('\\')) {
    return true;
  }
  if (rawName.startsWith('/')) {
    return true;
  }
  if (/[\x00-\x1f\x7f]/.test(rawName)) {
    return true;
  }
  return false;
}

export function sanitizeFilename(rawName: string): string | null {
  const base = rawName.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .normalize('NFKD')
    .replace(/[^\w.\- ]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '');
  if (!cleaned || cleaned === '.' || cleaned === '..') {
    return null;
  }
  return cleaned.slice(0, 80);
}

export function detectMimeFromBytes(bytes: Uint8Array): AllowedUploadMimeType | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf';
  }
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}

export function validateUploadFile(
  file: File,
): { ok: true; safeName: string; mime: AllowedUploadMimeType } | { ok: false; reason: UploadRejection } {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'too_large' };
  }
  if (isUnsafeFilename(file.name)) {
    return { ok: false, reason: 'unsafe_filename' };
  }
  const safeName = sanitizeFilename(file.name);
  if (!safeName) {
    return { ok: false, reason: 'unsafe_filename' };
  }
  const declaredMime = file.type;
  if (!declaredMime || !(declaredMime in ALLOWED_UPLOAD_MIME_TYPES)) {
    return { ok: false, reason: 'unsupported_type' };
  }
  return { ok: true, safeName, mime: declaredMime as AllowedUploadMimeType };
}

function attachmentSecret(): string {
  return process.env.SESSION_SECRET ?? 'dev-only-insecure-secret';
}

export function signAttachmentId(workspaceId: string, relativePath: string): string {
  const payload = Buffer.from(JSON.stringify({ workspaceId, relativePath })).toString('base64url');
  const signature = createHmac('sha256', attachmentSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyAttachmentId(attachmentId: string, workspaceId: string): string | null {
  const separator = attachmentId.lastIndexOf('.');
  if (separator <= 0) {
    return null;
  }
  const payload = attachmentId.slice(0, separator);
  const signature = attachmentId.slice(separator + 1);
  const expected = createHmac('sha256', attachmentSecret()).update(payload).digest('base64url');
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }
  let parsed: { workspaceId?: unknown; relativePath?: unknown };
  try {
    parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (parsed.workspaceId !== workspaceId || typeof parsed.relativePath !== 'string') {
    return null;
  }
  const resolved = path.resolve(uploadsRoot(), parsed.relativePath);
  if (!resolved.startsWith(uploadsRoot() + path.sep)) {
    return null;
  }
  return parsed.relativePath;
}

export async function storeUpload(
  workspaceId: string,
  file: File,
): Promise<{ ok: true; attachmentId: string; filename: string } | { ok: false; reason: UploadRejection }> {
  const validated = validateUploadFile(file);
  if (!validated.ok) {
    return validated;
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (detectMimeFromBytes(bytes) !== validated.mime) {
    return { ok: false, reason: 'unsupported_type' };
  }
  const uuid = randomUUID();
  const relativePath = path.join(workspaceId, `${uuid}-${validated.safeName}`);
  const absolutePath = path.join(uploadsRoot(), relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, bytes);
  return { ok: true, attachmentId: signAttachmentId(workspaceId, relativePath), filename: validated.safeName };
}

export function resolveAttachmentAbsolutePath(workspaceId: string, attachmentPath: string): string | null {
  const resolved = path.resolve(uploadsRoot(), attachmentPath);
  if (!resolved.startsWith(uploadsRoot() + path.sep)) {
    return null;
  }
  if (!fs.existsSync(resolved)) {
    return null;
  }
  return resolved;
}

export function attachmentDisplayName(attachmentPath: string): string {
  const base = path.basename(attachmentPath);
  return base.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/, '');
}

export function contentTypeForFilename(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}
