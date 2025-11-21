// Shared TypeScript types and interfaces for the donation platform

// ============================================================================
// ENUMS
// ============================================================================

export enum PledgeState {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentProvider {
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
  MOCK = 'MOCK',
}

export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
  CAMPAIGN_OWNER = 'CAMPAIGN_OWNER',
}

// ============================================================================
// ENTITIES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  goalAmount: number;
  currentAmount: number;
  status: CampaignStatus;
  ownerId: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pledge {
  id: string;
  campaignId: string;
  userId: string;
  amount: number;
  state: PledgeState;
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  pledgeId: string;
  amount: number;
  provider: PaymentProvider;
  providerTransactionId?: string;
  idempotencyKey: string;
  status: PledgeState;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  campaignId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: Date;
}

// ============================================================================
// EVENT PAYLOADS
// ============================================================================

export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: Date;
  version: string;
}

export interface CampaignCreatedEvent extends BaseEvent {
  eventType: 'campaign.created';
  payload: {
    campaignId: string;
    title: string;
    goalAmount: number;
    ownerId: string;
  };
}

export interface CampaignUpdatedEvent extends BaseEvent {
  eventType: 'campaign.updated';
  payload: {
    campaignId: string;
    updates: Partial<Campaign>;
  };
}

export interface PledgeCreatedEvent extends BaseEvent {
  eventType: 'pledge.created';
  payload: {
    pledgeId: string;
    campaignId: string;
    userId: string;
    amount: number;
    state: PledgeState;
  };
}

export interface PledgeStateChangedEvent extends BaseEvent {
  eventType: 'pledge.state_changed';
  payload: {
    pledgeId: string;
    campaignId: string;
    previousState: PledgeState;
    newState: PledgeState;
    amount: number;
  };
}

export interface PaymentAuthorizedEvent extends BaseEvent {
  eventType: 'payment.authorized';
  payload: {
    paymentId: string;
    pledgeId: string;
    campaignId: string;
    amount: number;
    provider: PaymentProvider;
    providerTransactionId?: string;
  };
}

export interface PaymentCapturedEvent extends BaseEvent {
  eventType: 'payment.captured';
  payload: {
    paymentId: string;
    pledgeId: string;
    campaignId: string;
    amount: number;
    provider: PaymentProvider;
    providerTransactionId: string;
  };
}

export interface PaymentFailedEvent extends BaseEvent {
  eventType: 'payment.failed';
  payload: {
    paymentId: string;
    pledgeId: string;
    campaignId: string;
    reason: string;
    provider: PaymentProvider;
  };
}

export interface PaymentRefundedEvent extends BaseEvent {
  eventType: 'payment.refunded';
  payload: {
    paymentId: string;
    pledgeId: string;
    campaignId: string;
    amount: number;
    reason?: string;
  };
}

export interface ChatMessageEvent extends BaseEvent {
  eventType: 'chat.message';
  payload: {
    messageId: string;
    campaignId: string;
    userId: string;
    userName: string;
    message: string;
  };
}

// Union type of all events
export type DomainEvent =
  | CampaignCreatedEvent
  | CampaignUpdatedEvent
  | PledgeCreatedEvent
  | PledgeStateChangedEvent
  | PaymentAuthorizedEvent
  | PaymentCapturedEvent
  | PaymentFailedEvent
  | PaymentRefundedEvent
  | ChatMessageEvent;

// ============================================================================
// DTOs (Data Transfer Objects)
// ============================================================================

export interface CreateCampaignDTO {
  title: string;
  description: string;
  goalAmount: number;
  startDate: string;
  endDate: string;
}

export interface UpdateCampaignDTO {
  title?: string;
  description?: string;
  goalAmount?: number;
  status?: CampaignStatus;
  endDate?: string;
}

export interface CreatePledgeDTO {
  campaignId: string;
  amount: number;
  paymentMethod?: string;
}

export interface ProcessPaymentDTO {
  pledgeId: string;
  provider: PaymentProvider;
  paymentMethodId: string;
  idempotencyKey: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  dependencies?: {
    [key: string]: {
      status: 'up' | 'down';
      latency?: number;
    };
  };
}

