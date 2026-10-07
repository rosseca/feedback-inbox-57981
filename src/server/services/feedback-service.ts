import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { evaluateCloseTransition } from '@/contracts/feedback';
import type {
  CloseFeedbackResponse,
  CreateFeedbackInput,
  FeedbackDto,
  FeedbackEventDto,
  FeedbackListResponse,
  ListFeedbackQuery,
} from '@/contracts/api';
import type { SessionUser } from '@/server/auth/session';
import { buildFeedbackClosedEmail } from '@/server/mail/payload';
import { getMailer } from '@/server/mail/mailer';
import * as feedbackRepo from '@/server/repositories/feedback';
import { HttpError } from '@/server/http';
import { logger } from '@/server/telemetry/logger';
import { withSpan } from '@/server/telemetry/tracing';
import {
  attachmentDisplayName,
  contentTypeForFilename,
  resolveAttachmentAbsolutePath,
  verifyAttachmentId,
} from './upload-service';

function toFeedbackDto(
  row: feedbackRepo.FeedbackRow,
  closedByDisplayName: string | null,
): FeedbackDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    attachmentFilename: row.attachmentPath ? attachmentDisplayName(row.attachmentPath) : null,
    closedAt: row.closedAt,
    closedByDisplayName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listFeedback(
  workspaceId: string,
  filters: ListFeedbackQuery,
): Promise<FeedbackListResponse> {
  return withSpan('feedback.list', { 'workspace.id': workspaceId }, async () => {
    const items = feedbackRepo.listActiveFeedback(workspaceId, filters).map((row) => toFeedbackDto(row, null));
    const activeCount = feedbackRepo.countActiveFeedback(workspaceId);
    return { items, activeCount };
  });
}

export async function getFeedbackDetail(
  workspaceId: string,
  feedbackId: string,
): Promise<{ feedback: FeedbackDto; history: FeedbackEventDto[] }> {
  return withSpan('feedback.detail', { 'workspace.id': workspaceId, 'feedback.id': feedbackId }, async () => {
    const row = feedbackRepo.getFeedbackWithHistory(feedbackId, workspaceId);
    if (!row) {
      throw new HttpError(404, 'not_found', 'Resource not found');
    }
    const history = feedbackRepo.getFeedbackHistory(feedbackId, workspaceId);
    return {
      feedback: toFeedbackDto(row.feedback, row.closedByDisplayName),
      history,
    };
  });
}

export async function createFeedback(session: SessionUser, input: CreateFeedbackInput): Promise<FeedbackDto> {
  return withSpan('feedback.create', { 'workspace.id': session.workspaceId }, async () => {
    let attachmentPath: string | null = null;
    if (input.attachmentId) {
      attachmentPath = verifyAttachmentId(input.attachmentId, session.workspaceId);
      if (!attachmentPath) {
        throw new HttpError(400, 'invalid_attachment', 'Attachment reference is invalid');
      }
    }

    const row = feedbackRepo.createFeedbackWithEvent({
      id: randomUUID(),
      workspaceId: session.workspaceId,
      actorUserId: session.userId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      attachmentPath,
    });

    logger.info('feedback.create', {
      workspaceId: session.workspaceId,
      feedbackId: row.id,
      actorUserId: session.userId,
      priority: row.priority,
      status: row.status,
      hasAttachment: attachmentPath !== null,
    });
    return toFeedbackDto(row, null);
  });
}

export async function closeFeedback(session: SessionUser, feedbackId: string): Promise<CloseFeedbackResponse> {
  return withSpan('feedback.close', {}, async () => {
    const existing = feedbackRepo.findFeedbackById(feedbackId);
    if (!existing) {
      throw new HttpError(404, 'not_found', 'Resource not found');
    }
    const transition = evaluateCloseTransition(existing.status);
    if (!transition) {
      throw new HttpError(404, 'not_found', 'Resource not found');
    }
    if (transition === 'already_closed') {
      logger.info('feedback.close', { feedbackId });
      return { feedback: toFeedbackDto(existing, null), outcome: 'already_closed' };
    }

    const creatorEmail = feedbackRepo.findFeedbackCreatorEmail(feedbackId);
    if (creatorEmail) {
      await getMailer().sendFeedbackClosedEmail(
        buildFeedbackClosedEmail({
          creatorEmail,
          feedbackTitle: existing.title,
          closedByDisplayName: session.displayName,
        }),
      );
    }

    const closed = feedbackRepo.markFeedbackClosed(feedbackId, session.userId);
    feedbackRepo.insertFeedbackClosedEvent({
      feedbackId,
      workspaceId: existing.workspaceId,
      actorUserId: session.userId,
      title: existing.title,
      createdAt: new Date().toISOString(),
    });

    logger.info('feedback.close', { feedbackId });
    return { feedback: toFeedbackDto(closed ?? existing, session.displayName), outcome: 'closed' };
  });
}

export async function downloadAttachment(workspaceId: string, feedbackId: string) {
  const row = feedbackRepo.findFeedbackByIdForWorkspace(feedbackId, workspaceId);
  if (!row?.attachmentPath) {
    throw new HttpError(404, 'not_found', 'Resource not found');
  }
  const absolutePath = resolveAttachmentAbsolutePath(workspaceId, row.attachmentPath);
  if (!absolutePath) {
    throw new HttpError(404, 'not_found', 'Resource not found');
  }
  const data = fs.readFileSync(absolutePath);
  return {
    data,
    contentType: contentTypeForFilename(absolutePath),
    filename: attachmentDisplayName(row.attachmentPath),
  };
}
