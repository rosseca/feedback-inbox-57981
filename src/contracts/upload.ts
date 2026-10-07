import { z } from 'zod';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = {
  'application/pdf': ['pdf'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
} as const;

export type AllowedUploadMimeType = keyof typeof ALLOWED_UPLOAD_MIME_TYPES;

export const uploadResponseSchema = z.object({
  attachmentId: z.string(),
  filename: z.string(),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
