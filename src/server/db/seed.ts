import { hashPassword } from '../auth/password';
import { PRIORITIES, type FeedbackPriority } from '../../contracts/feedback';
import { feedback, feedbackEvents, users, workspaces } from './schema';
import type { AppDatabase } from './index';

export const SEED_DEV_PASSWORD = 'pass123';

const timestamp = (dayOffset: number) =>
  new Date(Date.UTC(2026, 0, 5 + dayOffset, 9, 0, 0)).toISOString();

const HISTORY_AREAS = [
  'Checkout',
  'Search',
  'Invoices',
  'Mobile app',
  'CSV export',
  'SSO login',
  'Notifications',
  'Weekly reports',
  'Onboarding',
  'API keys',
] as const;

const HISTORY_ISSUES = [
  'times out after 30 seconds',
  'shows a blank page on retry',
  'duplicates the last submitted row',
  'ignores the selected date range',
  'fails for names with accents',
] as const;

function closedHistoryFor(input: { workspaceId: string; actorUserId: string; idPrefix: string; workspaceName: string }) {
  const rows: Array<{
    id: string;
    workspaceId: string;
    title: string;
    description: string;
    priority: FeedbackPriority;
    status: 'closed';
    closedAt: string;
    closedByUserId: string;
    createdAt: string;
    updatedAt: string;
  }> = [];
  const events: Array<{
    id: string;
    feedbackId: string;
    workspaceId: string;
    actorUserId: string;
    type: 'feedback_created' | 'feedback_closed';
    metadataJson: string;
    createdAt: string;
  }> = [];

  let index = 0;
  for (const area of HISTORY_AREAS) {
    for (const issue of HISTORY_ISSUES) {
      index += 1;
      const id = `fb_${input.idPrefix}_h${String(index).padStart(2, '0')}`;
      const title = `${area} ${issue}`;
      const createdAt = timestamp(4 + ((index * 7) % 83));
      const closedAt = timestamp(5 + ((index * 7) % 83) + (index % 4));
      const priority = PRIORITIES[index % PRIORITIES.length];
      rows.push({
        id,
        workspaceId: input.workspaceId,
        title,
        description: `${input.workspaceName} customers reported that ${area.toLowerCase()} ${issue}. Closed after triage; original ticket volume was high enough that the inbox no longer lists it.`,
        priority,
        status: 'closed',
        closedAt,
        closedByUserId: input.actorUserId,
        createdAt,
        updatedAt: closedAt,
      });
      events.push(
        {
          id: `ev_${input.idPrefix}_h${String(index).padStart(2, '0')}_created`,
          feedbackId: id,
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          type: 'feedback_created',
          metadataJson: JSON.stringify({ title }),
          createdAt,
        },
        {
          id: `ev_${input.idPrefix}_h${String(index).padStart(2, '0')}_closed`,
          feedbackId: id,
          workspaceId: input.workspaceId,
          actorUserId: input.actorUserId,
          type: 'feedback_closed',
          metadataJson: JSON.stringify({ title }),
          createdAt: closedAt,
        },
      );
    }
  }
  return { rows, events };
}

export async function seedDatabase(db: AppDatabase): Promise<void> {
  const passwordHash = await hashPassword(SEED_DEV_PASSWORD);

  await db
    .insert(workspaces)
    .values([
      { id: 'ws_acme', name: 'Acme Ltd' },
      { id: 'ws_globex', name: 'Globex Corp' },
    ])
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        id: 'user_acme',
        workspaceId: 'ws_acme',
        email: 'owner@acme.test',
        passwordHash,
        displayName: 'Acme Owner',
      },
      {
        id: 'user_globex',
        workspaceId: 'ws_globex',
        email: 'owner@globex.test',
        passwordHash,
        displayName: 'Globex Owner',
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(feedback)
    .values([
      {
        id: 'fb_acme_1',
        workspaceId: 'ws_acme',
        title: 'Dashboard export fails on large reports',
        description: 'Exporting a report with more than 500 rows produces an empty CSV file.',
        priority: 'high',
        status: 'new',
        createdAt: timestamp(0),
        updatedAt: timestamp(0),
      },
      {
        id: 'fb_acme_2',
        workspaceId: 'ws_acme',
        title: 'Add dark mode to the mobile app',
        description: 'Customers keep requesting a dark theme for evening reading sessions.',
        priority: 'low',
        status: 'triaged',
        createdAt: timestamp(1),
        updatedAt: timestamp(1),
      },
      {
        id: 'fb_acme_3',
        workspaceId: 'ws_acme',
        title: 'Search ignores punctuation',
        description: 'Searching for "e-mail" returns no results while "email" returns plenty.',
        priority: 'medium',
        status: 'planned',
        createdAt: timestamp(2),
        updatedAt: timestamp(2),
      },
      {
        id: 'fb_acme_4',
        workspaceId: 'ws_acme',
        title: 'Login page shows stale error',
        description: 'A previous login failure message stays visible after a successful sign in.',
        priority: 'medium',
        status: 'closed',
        closedAt: timestamp(3),
        closedByUserId: 'user_acme',
        createdAt: timestamp(2),
        updatedAt: timestamp(3),
      },
      {
        id: 'fb_globex_1',
        workspaceId: 'ws_globex',
        title: 'Invoice PDF missing tax id',
        description: 'Generated invoices omit the company tax identifier in the footer.',
        priority: 'high',
        status: 'new',
        createdAt: timestamp(0),
        updatedAt: timestamp(0),
      },
      {
        id: 'fb_globex_2',
        workspaceId: 'ws_globex',
        title: 'Bulk import rejects UTF-8 names',
        description: 'Customer names with accents fail the bulk import validation step.',
        priority: 'medium',
        status: 'triaged',
        createdAt: timestamp(1),
        updatedAt: timestamp(1),
      },
    ])
    .onConflictDoNothing();

  await db
    .insert(feedbackEvents)
    .values([
      {
        id: 'ev_acme_1_created',
        feedbackId: 'fb_acme_1',
        workspaceId: 'ws_acme',
        actorUserId: 'user_acme',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Dashboard export fails on large reports' }),
        createdAt: timestamp(0),
      },
      {
        id: 'ev_acme_2_created',
        feedbackId: 'fb_acme_2',
        workspaceId: 'ws_acme',
        actorUserId: 'user_acme',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Add dark mode to the mobile app' }),
        createdAt: timestamp(1),
      },
      {
        id: 'ev_acme_3_created',
        feedbackId: 'fb_acme_3',
        workspaceId: 'ws_acme',
        actorUserId: 'user_acme',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Search ignores punctuation' }),
        createdAt: timestamp(2),
      },
      {
        id: 'ev_acme_4_created',
        feedbackId: 'fb_acme_4',
        workspaceId: 'ws_acme',
        actorUserId: 'user_acme',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Login page shows stale error' }),
        createdAt: timestamp(2),
      },
      {
        id: 'ev_acme_4_closed',
        feedbackId: 'fb_acme_4',
        workspaceId: 'ws_acme',
        actorUserId: 'user_acme',
        type: 'feedback_closed',
        metadataJson: JSON.stringify({ title: 'Login page shows stale error' }),
        createdAt: timestamp(3),
      },
      {
        id: 'ev_globex_1_created',
        feedbackId: 'fb_globex_1',
        workspaceId: 'ws_globex',
        actorUserId: 'user_globex',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Invoice PDF missing tax id' }),
        createdAt: timestamp(0),
      },
      {
        id: 'ev_globex_2_created',
        feedbackId: 'fb_globex_2',
        workspaceId: 'ws_globex',
        actorUserId: 'user_globex',
        type: 'feedback_created',
        metadataJson: JSON.stringify({ title: 'Bulk import rejects UTF-8 names' }),
        createdAt: timestamp(1),
      },
    ])
    .onConflictDoNothing();

  const acmeHistory = closedHistoryFor({
    workspaceId: 'ws_acme',
    actorUserId: 'user_acme',
    idPrefix: 'acme',
    workspaceName: 'Acme Ltd',
  });
  const globexHistory = closedHistoryFor({
    workspaceId: 'ws_globex',
    actorUserId: 'user_globex',
    idPrefix: 'globex',
    workspaceName: 'Globex Corp',
  });

  await insertInChunks(db, feedback, [...acmeHistory.rows, ...globexHistory.rows]);
  await insertInChunks(db, feedbackEvents, [...acmeHistory.events, ...globexHistory.events]);
}

async function insertInChunks(
  db: AppDatabase,
  table: typeof feedback | typeof feedbackEvents,
  values: Array<Record<string, unknown>>,
): Promise<void> {
  const chunkSize = 20;
  for (let start = 0; start < values.length; start += chunkSize) {
    await db
      .insert(table)
      .values(values.slice(start, start + chunkSize) as never)
      .onConflictDoNothing();
  }
}
