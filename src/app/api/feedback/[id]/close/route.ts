import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/server/auth/session';
import { handleApiError, isSameOrigin, jsonError, unauthorized } from '@/server/http';
import { closeFeedback } from '@/server/services/feedback-service';

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) {
      return jsonError(403, 'forbidden', 'Cross-origin request rejected');
    }
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const { id } = await ctx.params;
    return NextResponse.json(await closeFeedback(session, id));
  } catch (error) {
    return handleApiError(error);
  }
}
