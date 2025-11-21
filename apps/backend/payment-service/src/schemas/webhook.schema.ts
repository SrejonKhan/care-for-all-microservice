import { z } from 'zod';
import { WebhookProvider } from '../models';

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const WebhookPayloadSchema = z.object({
  provider: z.nativeEnum(WebhookProvider),
  eventType: z.string().min(1, 'Event type is required'),
  eventId: z.string().min(1, 'Event ID is required'),
  signature: z.string().optional(),
  data: z.record(z.any()),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const WebhookResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

// ============================================================================
// TYPES
// ============================================================================

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WebhookResponse = z.infer<typeof WebhookResponseSchema>;

