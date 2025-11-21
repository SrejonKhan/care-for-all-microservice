# Chat Service

Production-ready Chat Service for real-time communication between users and admins in the CareForAll donation platform.

## Features

✅ **Real-time Messaging**: WebSocket-based instant messaging  
✅ **Conversation Management**: Create, list, and manage conversations  
✅ **User-Admin Chat**: Support for user-to-admin conversations  
✅ **Message Persistence**: All messages stored in MongoDB  
✅ **Read Receipts**: Track message read status  
✅ **Typing Indicators**: Real-time typing status  
✅ **JWT Authentication**: Secure WebSocket and REST API authentication  
✅ **Multi-participant Support**: Multiple users and admins in conversations  
✅ **Comprehensive Testing**: Unit and integration tests  
✅ **Observability**: OpenTelemetry tracing support  

## Architecture

### Conversation Model

- **Conversation-based**: Users create conversations, admins can join
- **1-on-1 or Multi-participant**: User + Admin(s) in a conversation
- **Status Management**: ACTIVE, CLOSED, ARCHIVED
- **Participant Tracking**: Track who joined when and last read timestamps

### WebSocket Communication

- **Connection**: `WS /ws/conversations/:conversationId?token={jwt}`
- **Authentication**: JWT token required in query parameter
- **Message Types**: TEXT, SYSTEM, FILE
- **Real-time Events**: Message sent/received, typing indicators, read receipts

### Message Flow

1. User creates conversation via REST API
2. User connects via WebSocket with JWT token
3. Messages sent via WebSocket are stored in MongoDB
4. Messages broadcasted to all participants in real-time
5. Read receipts tracked and synchronized

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Database**: MongoDB
- **WebSocket**: Bun WebSocket (via Hono)
- **Authentication**: JWT (shared secret with Auth Service)
- **Validation**: Zod (optional, for future OpenAPI)
- **Testing**: Bun test
- **Observability**: OpenTelemetry

## Database Models

### Conversation

```typescript
{
  conversationId: string; // Unique identifier
  participants: [{
    userId: string;
    role: 'USER' | 'ADMIN';
    joinedAt: Date;
    lastReadAt?: Date;
  }];
  createdBy: string; // userId
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  subject?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Message

```typescript
{
  messageId: string; // Unique identifier
  conversationId: string;
  senderId: string; // userId
  senderRole: 'USER' | 'ADMIN';
  content: string;
  messageType: 'TEXT' | 'SYSTEM' | 'FILE';
  readBy: [{
    userId: string;
    readAt: Date;
  }];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

## API Endpoints

### REST API

#### Conversations

- `GET /api/conversations` - List user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get conversation details
- `PUT /api/conversations/:id` - Update conversation
- `POST /api/conversations/:id/assign` - Assign admin (admin only)
- `PUT /api/conversations/:id/read` - Mark conversation as read

#### Messages

- `GET /api/conversations/:id/messages` - Get message history
- `POST /api/conversations/:id/messages` - Send message (REST fallback)

#### Health

- `GET /health` - Health check endpoint

### WebSocket API

#### Connection

```
WS /ws/conversations/:conversationId?token={jwt_token}
```

#### Client to Server Messages

```typescript
// Send message
{
  type: 'message',
  content: string,
  messageType?: 'TEXT' | 'SYSTEM' | 'FILE',
  metadata?: Record<string, any>
}

// Typing indicator
{
  type: 'typing',
  isTyping: boolean
}

// Mark as read
{
  type: 'read',
  messageId?: string // If not provided, mark all as read
}

// Ping
{
  type: 'ping'
}
```

#### Server to Client Messages

```typescript
// Message sent confirmation
{
  type: 'message_sent',
  messageId: string,
  conversationId: string,
  senderId: string,
  senderRole: 'USER' | 'ADMIN',
  content: string,
  messageType: string,
  createdAt: string
}

// Message received (broadcasted to others)
{
  type: 'message_received',
  messageId: string,
  conversationId: string,
  senderId: string,
  senderRole: 'USER' | 'ADMIN',
  content: string,
  messageType: string,
  createdAt: string
}

// Typing indicators
{
  type: 'typing_start' | 'typing_stop',
  userId: string
}

// Read receipt
{
  type: 'read_receipt',
  messageId: string,
  userId: string,
  readAt: string
}

// System messages
{
  type: 'system',
  message: string,
  timestamp: string
}

// User joined/left
{
  type: 'user_joined' | 'user_left',
  userId: string,
  role?: 'USER' | 'ADMIN'
}

// Error
{
  type: 'error',
  code: string,
  message: string
}
```

## Usage Examples

### Create Conversation

```bash
curl -X POST http://localhost:3006/api/conversations \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Support Request",
    "metadata": {}
  }'
```

### Connect via WebSocket

```javascript
const ws = new WebSocket(
  'ws://localhost:3006/ws/conversations/conv_123?token={jwt_token}'
);

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Send message
ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello, I need help!'
}));
```

### List Messages

```bash
curl -X GET http://localhost:3006/api/conversations/conv_123/messages \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json"
```

## Environment Variables

```env
# Service Configuration
PORT=3006
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_URL=mongodb://localhost:27017/chat-service

# JWT
JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----

# OpenTelemetry (Optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
OTEL_TRACES_ENABLED=false
```

## Development

### Install Dependencies

```bash
bun install
```

### Run Development Server

```bash
bun run dev
```

### Run Tests

```bash
bun test
```

### Build

```bash
bun run build
```

## Testing

### Unit Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/conversation.service.test.ts
```

### Test Coverage

- ConversationService: CRUD operations, access control
- MessageService: Message creation, read receipts, pagination
- WebSocketManager: Connection management, broadcasting
- API Integration: End-to-end conversation and message flow

## File Structure

```
chat-service/
├── src/
│   ├── config/
│   │   └── database.ts              # MongoDB connection
│   ├── models/
│   │   ├── conversation.model.ts    # Conversation schema
│   │   ├── message.model.ts         # Message schema
│   │   └── index.ts                 # Model exports
│   ├── services/
│   │   ├── conversation.service.ts  # Conversation CRUD
│   │   ├── message.service.ts       # Message operations
│   │   └── websocket-manager.service.ts # WebSocket management
│   ├── handlers/
│   │   └── websocket.handler.ts      # WebSocket event handlers
│   ├── middleware/
│   │   └── auth.ts                  # JWT authentication
│   ├── routes/
│   │   ├── conversations.ts         # Conversation routes
│   │   └── health.ts                # Health check
│   ├── types/
│   │   ├── chat.types.ts            # Chat types
│   │   └── websocket.types.ts       # WebSocket types
│   └── index.ts                     # Main entry point
├── tests/
│   ├── conversation.service.test.ts
│   ├── message.service.test.ts
│   └── api.test.ts
├── package.json
└── README.md
```

## Security Considerations

1. **JWT Authentication**: All WebSocket connections and REST API endpoints require valid JWT tokens
2. **Access Control**: Users can only access conversations they're part of (admins can access all)
3. **Input Validation**: Message content is validated and sanitized
4. **Connection Management**: WebSocket connections are tracked and cleaned up on disconnect
5. **Rate Limiting**: Consider adding rate limiting for production (not implemented yet)

## Performance Considerations

1. **Connection Pooling**: MongoDB connection pooling configured
2. **Message Pagination**: Large message histories are paginated
3. **Indexes**: Database indexes on conversationId, senderId, createdAt
4. **WebSocket Efficiency**: Efficient broadcasting to multiple connections
5. **Connection Cleanup**: Automatic cleanup of closed connections

## Future Enhancements

- [ ] File attachments support
- [ ] Message search functionality
- [ ] Push notifications for offline users
- [ ] Message reactions/emojis
- [ ] Conversation archiving automation
- [ ] Admin dashboard for conversation management
- [ ] Rate limiting
- [ ] Message encryption
- [ ] Voice/video call support (via WebRTC)

## Integration Points

**Consumes**:
- Auth Service (for JWT verification - can verify locally)

**Provides**:
- WebSocket endpoint for real-time chat
- REST API for conversation and message management

**Depends On**:
- MongoDB (chat-service database)
- JWT_PUBLIC_KEY (RSA public key for token verification)

## License

Part of the CareForAll donation platform.

