import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const PaymentProviderEnum = z.enum(['STRIPE', 'PAYPAL', 'MOCK']);

const ProcessPaymentSchema = z.object({
  pledgeId: z.string(),
  provider: PaymentProviderEnum,
  paymentMethodId: z.string(),
  idempotencyKey: z.string(),
});

const RefundPaymentSchema = z.object({
  reason: z.string().optional(),
});

const WebhookSchema = z.object({
  provider: PaymentProviderEnum,
  eventType: z.string(),
  payload: z.any(),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const processPaymentRoute = createRoute({
  method: 'post',
  path: '/payments',
  tags: ['Payments'],
  summary: 'Process a payment',
  description: 'Authorize a payment for a pledge with idempotency',
  request: {
    body: {
      content: {
        'application/json': {
          schema: ProcessPaymentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Payment authorized successfully',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    400: {
      description: 'Invalid request',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    409: {
      description: 'Duplicate request (idempotency key already used)',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const capturePaymentRoute = createRoute({
  method: 'post',
  path: '/payments/{id}/capture',
  tags: ['Payments'],
  summary: 'Capture a payment',
  description: 'Capture a previously authorized payment',
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      description: 'Payment captured successfully',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    404: {
      description: 'Payment not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const refundPaymentRoute = createRoute({
  method: 'post',
  path: '/payments/{id}/refund',
  tags: ['Payments'],
  summary: 'Refund a payment',
  description: 'Refund a captured payment',
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        'application/json': {
          schema: RefundPaymentSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Payment refunded successfully',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    404: {
      description: 'Payment not found',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const webhookRoute = createRoute({
  method: 'post',
  path: '/webhooks',
  tags: ['Payments'],
  summary: 'Payment provider webhook',
  description: 'Handle webhooks from payment providers (Stripe, PayPal, etc.)',
  request: {
    body: {
      content: {
        'application/json': {
          schema: WebhookSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

