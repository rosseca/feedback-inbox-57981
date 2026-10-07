import { NextResponse } from 'next/server';
import { logger } from '@/server/telemetry/logger';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function handleApiError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof HttpError) {
    return jsonError(error.status, error.code, error.message);
  }
  logger.error('api.unhandled_error', {
    message: error instanceof Error ? error.message : String(error),
  });
  return jsonError(500, 'internal_error', 'Internal server error');
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string>;
  };
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fieldErrors?: Record<string, string>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  );
}

export function badRequest(message = 'Invalid request', fieldErrors?: Record<string, string>) {
  return jsonError(400, 'bad_request', message, fieldErrors);
}

export function unauthorized(message = 'Authentication required') {
  return jsonError(401, 'unauthorized', message);
}

export function forbidden() {
  return jsonError(403, 'forbidden', 'Cross-origin request rejected');
}

export function notFound() {
  return jsonError(404, 'not_found', 'Resource not found');
}

export function payloadTooLarge(message = 'Payload too large') {
  return jsonError(413, 'payload_too_large', message);
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) {
    return true;
  }
  const host = req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
