import { sql } from 'drizzle-orm';
import { index, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { FeedbackEventType, FeedbackPriority, FeedbackStatus } from '../../contracts/feedback';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('users_workspace_idx').on(table.workspaceId)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

export const feedback = sqliteTable(
  'feedback',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    title: text('title').notNull(),
    description: text('description').notNull(),
    priority: text('priority').$type<FeedbackPriority>().notNull(),
    status: text('status').$type<FeedbackStatus>().notNull(),
    attachmentPath: text('attachment_path'),
    closedAt: text('closed_at'),
    closedByUserId: text('closed_by_user_id'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index('feedback_workspace_status_idx').on(table.workspaceId, table.status),
    index('feedback_workspace_priority_idx').on(table.workspaceId, table.priority),
  ],
);

export const feedbackEvents = sqliteTable(
  'feedback_events',
  {
    id: text('id').primaryKey(),
    feedbackId: text('feedback_id')
      .notNull()
      .references(() => feedback.id),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').$type<FeedbackEventType>().notNull(),
    metadataJson: text('metadata_json').notNull().default('{}'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('feedback_events_feedback_idx').on(table.feedbackId, table.type)],
);
