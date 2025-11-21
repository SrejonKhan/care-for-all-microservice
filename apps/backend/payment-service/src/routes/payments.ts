// @ts-nocheck
import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import {
  AuthorizePaymentSchema,
  CapturePaymentSchema,
  RefundPaymentSchema,
  ListPaymentsQuerySchema,
  PaymentResponseSchema,
  ListPaymentsResponseSchema,
  PaymentActionResponseSchema,
  ErrorResponseSchema,
} from '../schemas/payment.schema';

// ============================================================================
// AUTHORIZE PAYMENT
// ============================================================================

export const authorizePaymentRoute = createRoute({
  method: 'post',
  path: '/api/payments/authorize',
  tags: ['Payments'],
  summary: 'Authorize a payment',
  description: 'Authorize a payment for a donation. This holds the funds but does not capture them.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: AuthorizePaymentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Payment authorized successfully',
      content: {
        'application/json': {
          schema: PaymentActionResponseSchema,
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
      description: 'Duplicate idempotency key',
      content: {
        'application/json': {
          schema: PaymentActionResponseSchema,
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

// ============================================================================
// CAPTURE PAYMENT
// ============================================================================

export const capturePaymentRoute = createRoute({
  method: 'post',
  path: '/api/payments/{paymentId}/capture',
  tags: ['Payments'],
  summary: 'Capture an authorized payment',
  description: 'Capture an authorized payment. This charges the funds.',
  request: {
    params: z.object({
      paymentId: z.string().min(1),
    }),
    body: {
      content: {
        'application/json': {
          schema: CapturePaymentSchema.optional(),
        },
      },
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Payment captured successfully',
      content: {
        'application/json': {
          schema: PaymentActionResponseSchema,
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
    404: {
      description: 'Payment not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
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

// ============================================================================
// REFUND PAYMENT
// ============================================================================

export const refundPaymentRoute = createRoute({
  method: 'post',
  path: '/api/payments/{paymentId}/refund',
  tags: ['Payments'],
  summary: 'Refund a payment',
  description: 'Refund a captured or completed payment.',
  request: {
    params: z.object({
      paymentId: z.string().min(1),
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
          schema: PaymentActionResponseSchema,
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
    404: {
      description: 'Payment not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
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

// ============================================================================
// GET PAYMENT BY ID
// ============================================================================

export const getPaymentRoute = createRoute({
  method: 'get',
  path: '/api/payments/{paymentId}',
  tags: ['Payments'],
  summary: 'Get payment by ID',
  description: 'Retrieve a payment by its ID.',
  request: {
    params: z.object({
      paymentId: z.string().min(1),
    }),
  },
  responses: {
    200: {
      description: 'Payment found',
      content: {
        'application/json': {
          schema: PaymentActionResponseSchema,
        },
      },
    },
    404: {
      description: 'Payment not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
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

// ============================================================================
// LIST PAYMENTS
// ============================================================================

export const listPaymentsRoute = createRoute({
  method: 'get',
  path: '/api/payments',
  tags: ['Payments'],
  summary: 'List payments',
  description: 'List payments with optional filters.',
  request: {
    query: ListPaymentsQuerySchema,
  },
  responses: {
    200: {
      description: 'Payments retrieved successfully',
      content: {
        'application/json': {
          schema: ListPaymentsResponseSchema,
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
