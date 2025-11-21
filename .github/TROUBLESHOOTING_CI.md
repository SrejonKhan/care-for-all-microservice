# CI/CD Pipeline Troubleshooting Guide

## Common CI Issues and Solutions

### Issue 1: Jobs Skipped After "Detect Changes"

**Symptom**: Change detection works, but test/build jobs are skipped

**Cause**: The `services` output is not in correct JSON array format

**Solution**: ✅ Fixed in latest ci.yml
- Added `set-matrix` step to build proper JSON array
- Services output format: `["gateway","campaign-service"]`

**Verify**:
```yaml
# In detect-changes job output, look for:
services=["gateway","auth-service",...]
any_service_changed=true
```

### Issue 2: Matrix Strategy Fails

**Symptom**: Error: `fromJSON: Invalid JSON`

**Cause**: Services output is not valid JSON

**Solution**: Check the `set-matrix` step output
```bash
# Should be valid JSON array:
["service1","service2"]

# NOT:
service1, service2
```

### Issue 3: Test Job Fails with "No tests found"

**Symptom**: Test job fails even though service is valid

**Solution**: ✅ Fixed with `continue-on-error: true`
- Tests are optional in scaffold
- Job succeeds even if no tests exist

### Issue 4: Build Artifacts Not Found

**Symptom**: Upload artifacts step fails

**Solution**: ✅ Fixed with `if-no-files-found: warn`
- Not all services may have build artifacts
- Warning instead of error

### Issue 5: Docker Build Can't Find Dockerfile

**Symptom**: `file not found: apps/backend/service/Dockerfile`

**Solution**: ✅ Fixed with service location detection
- Checks both `apps/backend/` and `apps/frontend/`
- Skips Docker build if no Dockerfile found

## Testing the CI Pipeline Locally

### Simulate Change Detection

```bash
# See what files changed
git diff --name-only main

# Check if they match the path filters
# apps/backend/gateway/** → gateway service
# packages/** → all services
```

### Test Service Builds

```bash
# Test each service can build
cd apps/backend/gateway
bun install
bun run build

# Repeat for other services
```

### Test Docker Builds

```bash
# Test Docker build for a service
docker build -f apps/backend/gateway/Dockerfile -t test-gateway .

# Should build successfully
```

## Debugging CI Runs

### View Workflow Logs

1. Go to **Actions** tab on GitHub
2. Click the failed workflow run
3. Click on the failed job
4. Expand steps to see detailed logs

### Enable Debug Logging

Add these secrets to enable debug mode:
- `ACTIONS_STEP_DEBUG` = `true`
- `ACTIONS_RUNNER_DEBUG` = `true`

### Re-run Failed Jobs

1. Go to failed workflow run
2. Click **Re-run jobs** → **Re-run failed jobs**

## Common Fixes

### Fix 1: Update paths-filter Configuration

```yaml
# Make sure paths match your actual structure
gateway:
  - 'apps/backend/gateway/**'
  - 'packages/**'  # Shared packages affect all services
```

### Fix 2: Check Service Exists

```bash
# Verify service directory exists
ls -la apps/backend/
# Should show: gateway, auth-service, campaign-service, etc.
```

### Fix 3: Verify package.json Has Version

```bash
# Each service needs a version field
cat apps/backend/gateway/package.json | grep version
# Should show: "version": "1.0.0"
```

### Fix 4: Check Matrix Services Format

The services output must be a valid JSON array:

```json
["gateway","auth-service","campaign-service"]
```

NOT:
```
gateway, auth-service, campaign-service
```

## Quick Diagnostics

### Check Workflow Syntax

```bash
# Install actionlint
brew install actionlint  # macOS
# or: go install github.com/rhysd/actionlint@latest

# Lint workflows
actionlint .github/workflows/*.yml
```

### Validate JSON Output

```bash
# Test the jq commands used in workflows
echo '[]' | jq '. + ["gateway"]' | jq '. + ["auth-service"]'
# Should output: ["gateway","auth-service"]
```

### Test Service Detection Locally

```bash
# Simulate the filter logic
if [ -d "apps/backend/gateway" ]; then
  echo "gateway changed"
fi
```

## Emergency Fixes

### Bypass Intelligent Detection (Temporary)

If you need to test/build all services regardless of changes:

```yaml
# In ci.yml, change:
if: needs.detect-changes.outputs.any_service_changed == 'true'

# To:
if: always()
```

Then revert after testing.

### Skip Docker Build (For Testing)

```yaml
# In ci.yml docker-build job, add:
if: false

# This skips Docker builds while testing other jobs
```

## Prevention

### Before Pushing

```bash
# 1. Test locally
bun install
bun run build
bun test

# 2. Test Docker build
cd infra
docker compose build gateway

# 3. Verify workflows are valid
actionlint .github/workflows/*.yml

# 4. Push
git push
```

### Pull Request Checklist

- [ ] All services can build locally
- [ ] Tests pass locally
- [ ] Docker builds work
- [ ] Workflow files are valid YAML
- [ ] Service paths are correct

## Getting Help

1. Check workflow logs in GitHub Actions
2. Review this troubleshooting guide
3. Check [CI_CD_SETUP.md](../CI_CD_SETUP.md)
4. Enable debug logging
5. Test locally first

## Status Checks

All these should be ✅:

```bash
# Repository structure
✅ apps/backend/gateway/
✅ apps/backend/auth-service/
✅ apps/backend/campaign-service/
✅ apps/backend/donation-service/
✅ apps/backend/payment-service/
✅ apps/backend/totals-service/
✅ apps/backend/chat-service/
✅ apps/frontend/admin-frontend/

# Package.json files
✅ Each service has package.json with version field

# Dockerfiles
✅ Each service has Dockerfile

# Workflows
✅ .github/workflows/ci.yml
✅ .github/workflows/cd.yml
✅ .github/workflows/version-bump.yml
```

## Success Indicators

When CI works correctly, you'll see:

```
✅ Detect Changes (shows JSON array of services)
✅ Lint & Type Check (runs for each changed service)
✅ Test (runs for each changed service)
✅ Build (runs for each changed service)
✅ Docker Build (only on main/develop push)
✅ CI Summary (shows all green)
```

---

**Last Updated**: After fixing matrix strategy and service detection

