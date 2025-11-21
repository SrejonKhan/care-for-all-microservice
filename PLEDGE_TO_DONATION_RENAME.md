# Pledge Service → Donation Service Rename

## Summary

Successfully renamed `pledge-service` to `donation-service` throughout the entire codebase.

## Changes Made

### 1. Directory & Files
- ✅ Renamed: `apps/backend/pledge-service/` → `apps/backend/donation-service/`
- ✅ Renamed: `src/routes/pledges.ts` → `src/routes/donations.ts`

### 2. Package Configuration
- ✅ `package.json`: `@care-for-all/pledge-service` → `@care-for-all/donation-service`

### 3. Service Code (`donation-service/src/`)
- ✅ Updated service name in config loader
- ✅ Updated logger service name
- ✅ Updated OpenTelemetry tracing service name
- ✅ Updated health check response
- ✅ Updated API documentation title
- ✅ Updated all log messages
- ✅ Updated all TODO comments

### 4. API Routes (`donations.ts`)
Updated all route definitions:
- ✅ `/pledges` → `/donations`
- ✅ `/pledges/{id}` → `/donations/{id}`
- ✅ `/pledges/{id}/transition` → `/donations/{id}/transition`
- ✅ Tags: `['Pledges']` → `['Donations']`
- ✅ All descriptions updated

### 5. Gateway Configuration
- ✅ Route proxy: `/api/pledges/*` → `/api/donations/*`
- ✅ Service URL: `PLEDGE_SERVICE_URL` → `DONATION_SERVICE_URL`

### 6. Shared Configuration (`packages/shared-config/`)
- ✅ Environment variable: `PLEDGE_SERVICE_URL` → `DONATION_SERVICE_URL`
- ✅ Default URL: `http://pledge-service:3000` → `http://donation-service:3000`
- ✅ Updated `getServiceUrls()` function

### 7. Docker Configuration
- ✅ `docker-compose.yml`: Service name and build context updated
- ✅ `Dockerfile`: All internal paths updated
- ✅ Container name: `pledge-service` → `donation-service`
- ✅ Environment variables updated

### 8. Documentation (3 files)

**README.md:**
- ✅ Service list
- ✅ Service URLs table
- ✅ Project structure diagram
- ✅ TODO section

**CONTRIBUTING.md:**
- ✅ Project structure

**infra/README.md:**
- ✅ Services table

**ARCHITECTURE.md (extensive updates):**
- ✅ Service list and descriptions
- ✅ Gateway routes
- ✅ Service responsibilities
- ✅ Event names: `pledge.*` → `donation.*`
- ✅ Database schema: `pledges` table → `donations` table
- ✅ Foreign keys: `pledge_id` → `donation_id`
- ✅ Table columns: `total_pledges` → `total_donations`
- ✅ Event flow examples
- ✅ CQRS documentation
- ✅ Business metrics

## Event Schema Updates

### Old Events:
- `pledge.created`
- `pledge.state_changed`

### New Events:
- `donation.created`
- `donation.state_changed`

## Database Schema Updates

### Old:
```sql
CREATE TABLE pledges (
  id UUID PRIMARY KEY,
  pledge_id UUID REFERENCES...
);
```

### New:
```sql
CREATE TABLE donations (
  id UUID PRIMARY KEY,
  donation_id UUID REFERENCES...
);
```

## API Endpoint Changes

| Old Endpoint | New Endpoint |
|--------------|--------------|
| `POST /api/pledges` | `POST /api/donations` |
| `GET /api/pledges/{id}` | `GET /api/donations/{id}` |
| `POST /api/pledges/{id}/transition` | `POST /api/donations/{id}/transition` |

## Environment Variables

| Old Variable | New Variable |
|--------------|--------------|
| `PLEDGE_SERVICE_URL` | `DONATION_SERVICE_URL` |

## Verification

✅ Directory renamed successfully
✅ Dependencies updated (bun install)
✅ All code references updated
✅ All documentation updated
✅ Docker configuration updated
✅ No remaining "pledge" references in service code

## Testing

To verify everything works:

```bash
# Check directory structure
tree -L 2 apps/backend/

# Verify dependencies
bun install

# Test building the service
cd apps/backend/donation-service
bun run build

# Test Docker build
cd infra
docker compose build donation-service

# Test full stack
docker compose up donation-service
```

## Notes

- The state enum `PledgeState` in shared-types still uses the name `PledgeState` but represents donation states. This could be renamed to `DonationState` if needed.
- All references to "pledge" in variable names and comments within the donation service have been updated to "donation".
- The service is now consistently called "donation-service" throughout the codebase.

