import { createRoute } from '@hono/zod-openapi';
import {
  WebhookPayloadSchema,
  WebhookResponseSchema,
} from '../schemas/webhook.schema';
import { ErrorResponseSchema } from '../schemas/payment.schema';

// ============================================================================
// WEBHOOK ROUTE
// ============================================================================

export const webhookRoute = createRoute({
  method: 'post',
  path: '/api/webhooks',
  tags: ['Webhooks'],
  summary: 'Receive payment provider webhooks',
  description: 'Endpoint for receiving webhooks from payment providers (Stripe, PayPal, etc.)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: WebhookPayloadSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: WebhookResponseSchema,
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    409: {
      description: 'Duplicate webhook',
      content: {
        'application/json': {
          schema: WebhookResponseSchema,
        },
      },
    },
    500: {
      description: 'Internal server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

