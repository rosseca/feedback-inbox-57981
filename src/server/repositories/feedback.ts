import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { ACTIVE_STATUSES, evaluateCloseTransition, type CloseOutcome, type FeedbackPriority } from '@/contracts/feedback';
import type { ListFeedbackQuery } from '@/contracts/api';
import { getDb } from '../db';
import { feedback, feedbackEvents, users } from '../db/schema';

export type FeedbackRow = typeof feedback.$inferSelect;

export interface CloseTransactionResult {
  outcome: CloseOutcome;
  feedback: FeedbackRow;
  previousStatus: FeedbackRow['status'];
  creatorEmail: string | null;
}

const closerUsers = alias(users, 'closed_by_user');

export function listActiveFeedback(workspaceId: string, filters: ListFeedbackQuery): FeedbackRow[] {
  const conditions = [
    eq(feedback.workspaceId, workspaceId),
    inArray(feedback.status, [...ACTIVE_STATUSES]),
  ];
  if (filters.query) {
    const escaped = filters.query.replace(/[\\%_]/g, (char: string) => `\\${char}`).toLowerCase();
    conditions.push(sql`lower(${feedback.title}) like ${`%${escaped}%`} escape '\\'`);
  }
  if (filters.status) {
    conditions.push(eq(feedback.status, filters.status));
  }
  if (filters.priority) {
    conditions.push(eq(feedback.priority, filters.priority));
  }
  return getDb()
    .select()
    .from(feedback)
    .where(and(...conditions))
    .orderBy(desc(feedback.createdAt))
    .all();
}

export function countActiveFeedback(workspaceId: string): number {
  const row = getDb()
    .select({ value: sql<number>`count(*)` })
    .from(feedback)
    .where(and(eq(feedback.workspaceId, workspaceId), inArray(feedback.status, [...ACTIVE_STATUSES])))
    .get();
  return Number(row?.value ?? 0);
}

export function findFeedbackByIdForWorkspace(id: string, workspaceId: string): FeedbackRow | null {
  return (
    getDb()
      .select()
      .from(feedback)
      .where(and(eq(feedback.id, id), eq(feedback.workspaceId, workspaceId)))
      .limit(1)
      .get() ?? null
  );
}

export function getFeedbackWithHistory(
  id: string,
  workspaceId: string,
): { feedback: FeedbackRow; closedByDisplayName: string | null } | null {
  const row = getDb()
    .select({ feedback: feedback, closedByDisplayName: closerUsers.displayName })
    .from(feedback)
    .leftJoin(closerUsers, eq(closerUsers.id, feedback.closedByUserId))
    .where(and(eq(feedback.id, id), eq(feedback.workspaceId, workspaceId)))
    .limit(1)
    .get();
  if (!row) {
    return null;
  }
  return { feedback: row.feedback, closedByDisplayName: row.closedByDisplayName };
}

export function getFeedbackHistory(feedbackId: string, workspaceId: string) {
  return getDb()
    .select({
      id: feedbackEvents.id,
      type: feedbackEvents.type,
      actorDisplayName: users.displayName,
      createdAt: feedbackEvents.createdAt,
    })
    .from(feedbackEvents)
    .innerJoin(users, eq(users.id, feedbackEvents.actorUserId))
    .where(and(eq(feedbackEvents.feedbackId, feedbackId), eq(feedbackEvents.workspaceId, workspaceId)))
    .orderBy(asc(feedbackEvents.createdAt))
    .all();
}

export function createFeedbackWithEvent(input: {
  id: string;
  workspaceId: string;
  actorUserId: string;
  title: string;
  description: string;
  priority: FeedbackPriority;
  attachmentPath: string | null;
}): FeedbackRow {
  const db = getDb();
  return db.transaction((tx) => {
    const now = new Date().toISOString();
    tx.insert(feedback)
      .values({
        id: input.id,
        workspaceId: input.workspaceId,
        title: input.title,
        description: input.description,
        priority: input.priority,
        status: 'new',
        attachmentPath: input.attachmentPath,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(feedbackEvents)
      .values({
        id: randomUUID(),
        feedbackId: input.id,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: input.title }),
        createdAt: now,
      })
      .run();
    return tx.select().from(feedback).where(eq(feedback.id, input.id)).get()!;
  });
}

export function closeFeedbackInTransaction(
  id: string,
  workspaceId: string,
  actorUserId: string,
): CloseTransactionResult | null {
  const db = getDb();
  return db.transaction(
    (tx) => {
      const existing = tx
        .select()
        .from(feedback)
        .where(and(eq(feedback.id, id), eq(feedback.workspaceId, workspaceId)))
        .limit(1)
        .get();
      if (!existing) {
        return null;
      }
      const transition = evaluateCloseTransition(existing.status);
      if (!transition) {
        return null;
      }
      if (transition === 'already_closed') {
        return { outcome: 'already_closed', feedback: existing, previousStatus: existing.status, creatorEmail: null };
      }

      const now = new Date().toISOString();
      const updated = tx
        .update(feedback)
        .set({ status: 'closed', closedAt: now, closedByUserId: actorUserId, updatedAt: now })
        .where(and(eq(feedback.id, id), eq(feedback.workspaceId, workspaceId), eq(feedback.status, existing.status)))
        .returning()
        .get();

      tx.insert(feedbackEvents)
        .values({
          id: randomUUID(),
          feedbackId: id,
          workspaceId,
          actorUserId,
          type: 'feedback_closed',
          metadataJson: JSON.stringify({ title: existing.title }),
          createdAt: now,
        })
        .run();

      const createdEvent = tx
        .select({ actorUserId: feedbackEvents.actorUserId })
        .from(feedbackEvents)
        .where(and(eq(feedbackEvents.feedbackId, id), eq(feedbackEvents.type, 'feedback_created')))
        .limit(1)
        .get();
      const creator = createdEvent
        ? tx.select().from(users).where(eq(users.id, createdEvent.actorUserId)).limit(1).get()
        : null;

      return {
        outcome: 'closed',
        feedback: updated,
        previousStatus: existing.status,
        creatorEmail: creator?.email ?? null,
      };
    },
    { behavior: 'immediate' },
  );
}
