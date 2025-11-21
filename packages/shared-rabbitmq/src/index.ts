import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';

// ============================================================================
// TYPES
// ============================================================================

export interface RabbitMQConfig {
  url: string;
  exchange: string;
  queuePrefix?: string;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface PublishOptions {
  persistent?: boolean;
  contentType?: string;
  headers?: Record<string, unknown>;
}

export interface ConsumeOptions {
  prefetch?: number;
  noAck?: boolean;
  exclusive?: boolean;
}

export type MessageHandler = (
  message: unknown,
  rawMessage: ConsumeMessage
) => Promise<void> | void;

// ============================================================================
// RABBITMQ CONNECTION MANAGER
// ============================================================================

export class RabbitMQManager {
  private config: RabbitMQConfig;
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private isConnecting = false;
  private reconnectTimeout: Timer | null = null;

  constructor(config: RabbitMQConfig) {
    this.config = {
      retryAttempts: 5,
      retryDelay: 5000,
      ...config,
    };
  }

  /**
   * Connect to RabbitMQ and create a channel
   */
  async connect(): Promise<void> {
    if (this.isConnecting) {
      throw new Error('Connection attempt already in progress');
    }

    if (this.connection && this.channel) {
      return; // Already connected
    }

    this.isConnecting = true;

    try {
      console.log(`[RabbitMQ] Connecting to ${this.config.url}...`);
      
      this.connection = await amqp.connect(this.config.url);
      this.channel = await this.connection.createChannel();

      // Declare the exchange
      await this.channel.assertExchange(this.config.exchange, 'topic', {
        durable: true,
      });

      // Set up error handlers
      this.connection.on('error', (err) => {
        console.error('[RabbitMQ] Connection error:', err);
        this.handleDisconnect();
      });

      this.connection.on('close', () => {
        console.warn('[RabbitMQ] Connection closed');
        this.handleDisconnect();
      });

      console.log('[RabbitMQ] Connected successfully');
      this.isConnecting = false;
    } catch (error) {
      this.isConnecting = false;
      console.error('[RabbitMQ] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Handle disconnection and attempt to reconnect
   */
  private handleDisconnect(): void {
    this.connection = null;
    this.channel = null;

    if (this.reconnectTimeout) {
      return; // Already scheduled
    }

    console.log(`[RabbitMQ] Attempting to reconnect in ${this.config.retryDelay}ms...`);
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect().catch((err) => {
        console.error('[RabbitMQ] Reconnection failed:', err);
      });
    }, this.config.retryDelay);
  }

  /**
   * Publish an event to the exchange
   */
  async publishEvent(
    routingKey: string,
    payload: unknown,
    options: PublishOptions = {}
  ): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available. Call connect() first.');
    }

    const message = Buffer.from(JSON.stringify(payload));

    const publishOptions = {
      persistent: options.persistent ?? true,
      contentType: options.contentType ?? 'application/json',
      timestamp: Date.now(),
      headers: options.headers || {},
    };

    return this.channel.publish(
      this.config.exchange,
      routingKey,
      message,
      publishOptions
    );
  }

  /**
   * Consume messages from a queue
   */
  async consume(
    queue: string,
    routingKeys: string[],
    handler: MessageHandler,
    options: ConsumeOptions = {}
  ): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not available. Call connect() first.');
    }

    const fullQueueName = this.config.queuePrefix 
      ? `${this.config.queuePrefix}.${queue}`
      : queue;

    // Assert queue
    await this.channel.assertQueue(fullQueueName, {
      durable: true,
    });

    // Bind queue to routing keys
    for (const routingKey of routingKeys) {
      await this.channel.bindQueue(
        fullQueueName,
        this.config.exchange,
        routingKey
      );
    }

    // Set prefetch if specified
    if (options.prefetch) {
      await this.channel.prefetch(options.prefetch);
    }

    console.log(`[RabbitMQ] Consuming from queue: ${fullQueueName}`);
    console.log(`[RabbitMQ] Routing keys: ${routingKeys.join(', ')}`);

    // Start consuming
    await this.channel.consume(
      fullQueueName,
      async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content, msg);

          // Acknowledge message if not auto-ack
          if (!options.noAck && this.channel) {
            this.channel.ack(msg);
          }
        } catch (error) {
          console.error('[RabbitMQ] Error processing message:', error);
          
          // Reject and requeue the message
          if (this.channel) {
            this.channel.nack(msg, false, true);
          }
        }
      },
      {
        noAck: options.noAck ?? false,
        exclusive: options.exclusive ?? false,
      }
    );
  }

  /**
   * Close connection gracefully
   */
  async close(): Promise<void> {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }

      console.log('[RabbitMQ] Connection closed');
    } catch (error) {
      console.error('[RabbitMQ] Error closing connection:', error);
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

let instance: RabbitMQManager | null = null;

/**
 * Create or get singleton RabbitMQ manager instance
 */
export function createRabbitMQManager(config: RabbitMQConfig): RabbitMQManager {
  if (!instance) {
    instance = new RabbitMQManager(config);
  }
  return instance;
}

/**
 * Get existing RabbitMQ manager instance
 */
export function getRabbitMQManager(): RabbitMQManager {
  if (!instance) {
    throw new Error('RabbitMQ manager not initialized. Call createRabbitMQManager first.');
  }
  return instance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to publish domain event
 */
export async function publishDomainEvent(
  manager: RabbitMQManager,
  eventType: string,
  payload: unknown
): Promise<boolean> {
  const event = {
    eventId: generateEventId(),
    eventType,
    timestamp: new Date().toISOString(),
    version: '1.0',
    payload,
  };

  return manager.publishEvent(eventType, event);
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

