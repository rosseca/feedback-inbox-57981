import { NextResponse } from 'next/server';
import { MAX_UPLOAD_BYTES } from '@/contracts/upload';
import { getSessionFromRequest } from '@/server/auth/session';
import { badRequest, handleApiError, isSameOrigin, jsonError, payloadTooLarge, unauthorized } from '@/server/http';
import { storeUpload } from '@/server/services/upload-service';

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return jsonError(403, 'forbidden', 'Cross-origin request rejected');
    }
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_UPLOAD_BYTES + 64 * 1024) {
      return payloadTooLarge('File exceeds the 5 MB limit');
    }
    const form = await req.formData().catch(() => null);
    if (!form) {
      return badRequest('Expected multipart form data');
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return badRequest('Missing file');
    }
    const stored = await storeUpload(session.workspaceId, file);
    if (!stored.ok) {
      if (stored.reason === 'too_large') {
        return payloadTooLarge('File exceeds the 5 MB limit');
      }
      if (stored.reason === 'unsafe_filename') {
        return badRequest('Unsafe filename');
      }
      return badRequest('Unsupported file type');
    }
    return NextResponse.json({ attachmentId: stored.attachmentId, filename: stored.filename }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
