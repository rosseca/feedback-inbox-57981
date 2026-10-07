import { z } from 'zod';
import { ACTIVE_STATUSES, FEEDBACK_STATUSES, PRIORITIES } from './feedback';

export const createFeedbackSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000),
  priority: z.enum(PRIORITIES),
  attachmentId: z.string().min(1).max(1024).optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;

export const listFeedbackQuerySchema = z.object({
  query: z.string().trim().max(120).optional(),
  status: z.enum(ACTIVE_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

export type ListFeedbackQuery = z.infer<typeof listFeedbackQuerySchema>;

export const feedbackDtoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(PRIORITIES),
  status: z.enum(FEEDBACK_STATUSES),
  attachmentFilename: z.string().nullable(),
  closedAt: z.string().nullable(),
  closedByDisplayName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeedbackDto = z.infer<typeof feedbackDtoSchema>;

export const feedbackEventDtoSchema = z.object({
  id: z.string(),
  type: z.enum(['feedback_created', 'feedback_closed']),
  actorDisplayName: z.string(),
  createdAt: z.string(),
});

export type FeedbackEventDto = z.infer<typeof feedbackEventDtoSchema>;

export const feedbackListResponseSchema = z.object({
  items: z.array(feedbackDtoSchema),
  activeCount: z.number().int().min(0),
});

export type FeedbackListResponse = z.infer<typeof feedbackListResponseSchema>;

export const closeFeedbackResponseSchema = z.object({
  feedback: feedbackDtoSchema,
  outcome: z.enum(['closed', 'already_closed']),
});

export type CloseFeedbackResponse = z.infer<typeof closeFeedbackResponseSchema>;
