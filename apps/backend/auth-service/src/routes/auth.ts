import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

// ============================================================================
// SCHEMAS
// ============================================================================

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
});

const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: AuthTokensSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

export const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Authentication'],
  summary: 'User login',
  description: 'Authenticate a user and return JWT tokens',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

export const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Authentication'],
  summary: 'User registration',
  description: 'Register a new user and return JWT tokens',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterRequestSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
    409: {
      description: 'User already exists',
      content: {
        'application/json': {
          schema: ApiResponseSchema,
        },
      },
    },
  },
});

