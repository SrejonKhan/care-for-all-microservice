# Contributing to Care For All

Thank you for your interest in contributing to the Care For All donation platform!

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone <your-fork-url>
   cd care-for-all-microservice
   ```
3. **Install dependencies**
   ```bash
   bun install
   ```
4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running Services Locally

```bash
# Run all services in dev mode
bun run dev

# Run specific service
cd apps/backend/campaign-service
bun run dev
```

### Running with Docker

```bash
cd infra
docker compose up --build
```

### Code Style

- Use TypeScript for all code
- Follow existing code patterns
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Commit Messages

Follow conventional commits:

```
feat: add new endpoint for campaign stats
fix: resolve race condition in payment processing
docs: update API documentation
chore: upgrade dependencies
test: add tests for pledge state machine
```

### Testing

```bash
# Run tests for all packages
bun run test

# Run tests for specific package
cd apps/backend/campaign-service
bun test
```

### Building

```bash
# Build all packages
bun run build

# Build specific package
cd apps/backend/campaign-service
bun run build
```

## Project Structure

```
care-for-all-microservice/
├── apps/
│   ├── backend/           # Backend microservices
│   │   ├── gateway/       # API Gateway
│   │   ├── auth-service/  # Authentication
│   │   ├── campaign-service/ # Campaigns
│   │   ├── donation-service/ # Donations
│   │   ├── payment-service/  # Payments
│   │   ├── totals-service/   # Totals
│   │   └── chat-service/     # Chat
│   └── frontend/          # Frontend applications
│       └── admin-frontend/   # Admin UI
├── packages/              # Shared packages
│   ├── shared-types/      # Common types
│   ├── shared-config/     # Config loader
│   ├── shared-logger/     # Logger
│   ├── shared-rabbitmq/   # RabbitMQ utils
│   └── shared-otel/       # OpenTelemetry
└── infra/                 # Infrastructure
    ├── docker-compose.yml
    └── ...configs
```

## Adding a New Service

1. Create service directory in `apps/`
2. Copy structure from existing service
3. Update `package.json` with dependencies
4. Implement service logic
5. Add Dockerfile
6. Add service to `infra/docker-compose.yml`
7. Update README

## Adding a New Shared Package

1. Create package directory in `packages/`
2. Add `package.json` with `workspace:*` for internal deps
3. Add `tsconfig.json` extending base config
4. Implement package logic
5. Export from `src/index.ts`
6. Update dependent services

## Database Changes

TODO: Add migration instructions when database schema is implemented

## Event-Driven Communication

When adding new events:

1. Define event type in `packages/shared-types`
2. Publish event in source service using `shared-rabbitmq`
3. Consume event in target service
4. Update documentation

## API Documentation

All services use OpenAPI with Scalar:

1. Define Zod schemas for requests/responses
2. Use `createRoute` from `@hono/zod-openapi`
3. Register routes with `app.openapi(route, handler)`
4. Access docs at `/docs` endpoint

## Pull Request Process

1. Update README if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update documentation
5. Create pull request with clear description
6. Address review comments
7. Squash commits if requested

## CI/CD

GitHub Actions runs on every PR and push:

- Only changed services are tested/built (Turborepo filters)
- All tests must pass
- Code must build successfully

## Code Review Guidelines

When reviewing code:

- Check for proper error handling
- Verify logging is appropriate
- Ensure types are well-defined
- Look for potential security issues
- Test the changes locally if possible

## Questions?

Open an issue or discussion on GitHub!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

