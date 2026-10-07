import { NextResponse } from 'next/server';
import { createFeedbackSchema, listFeedbackQuerySchema } from '@/contracts/api';
import { getSessionFromRequest } from '@/server/auth/session';
import { badRequest, handleApiError, isSameOrigin, jsonError, unauthorized } from '@/server/http';
import { createFeedback, listFeedback } from '@/server/services/feedback-service';

export async function GET(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const url = new URL(req.url);
    const parsed = listFeedbackQuerySchema.safeParse({
      query: url.searchParams.get('query') ?? undefined,
      status: url.searchParams.get('status') ?? undefined,
      priority: url.searchParams.get('priority') ?? undefined,
    });
    if (!parsed.success) {
      return badRequest('Invalid list filters');
    }
    return NextResponse.json(await listFeedback(session.workspaceId, parsed.data));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) {
      return jsonError(403, 'forbidden', 'Cross-origin request rejected');
    }
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const parsed = createFeedbackSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return badRequest('Invalid feedback payload');
    }
    const feedback = await createFeedback(session, parsed.data);
    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
