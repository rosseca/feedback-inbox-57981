import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/server/auth/session';
import { handleApiError, unauthorized } from '@/server/http';
import { downloadAttachment } from '@/server/services/feedback-service';

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return unauthorized();
    }
    const { id } = await ctx.params;
    const file = await downloadAttachment(session.workspaceId, id);
    return new NextResponse(file.data, {
      headers: {
        'content-type': file.contentType,
        'content-disposition': `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
