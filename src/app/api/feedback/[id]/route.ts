import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/server/auth/session';
import { handleApiError, unauthorized } from '@/server/http';
import { getFeedbackDetail } from '@/server/services/feedback-service';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const { id } = await ctx.params;
    return NextResponse.json(await getFeedbackDetail(session.workspaceId, id));
  } catch (error) {
    return handleApiError(error);
  }
}
