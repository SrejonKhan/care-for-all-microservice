# GitHub Container Registry Setup

## Issue: Permission Denied for Package Creation

If you see this error:
```
ERROR: denied: installation not allowed to Create organization package
```

This means GitHub Actions doesn't have permission to push Docker images to GitHub Container Registry (ghcr.io).

## Solutions

### Solution 1: Enable Package Permissions (Recommended)

#### For Personal Repositories

1. Go to your **GitHub Profile** → **Settings**
2. Scroll down to **Developer settings** (left sidebar)
3. Click **Personal access tokens** → **Tokens (classic)**
4. Or go directly to: https://github.com/settings/tokens
5. Click **Generate new token** → **Generate new token (classic)**
6. Give it a name: `GitHub Actions Package Write`
7. Select scopes:
   - ✅ `write:packages` - Upload packages to GitHub Package Registry
   - ✅ `read:packages` - Download packages from GitHub Package Registry
   - ✅ `delete:packages` - Delete packages from GitHub Package Registry
8. Click **Generate token**
9. Copy the token immediately (you won't see it again)

Then add as repository secret:
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `GHCR_TOKEN`
4. Value: (paste your personal access token)

Update the workflow to use this token:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GHCR_TOKEN }}  # Use PAT instead of GITHUB_TOKEN
```

#### For Organization Repositories

1. Go to **Organization Settings**
2. **Actions** → **General**
3. Scroll to **Workflow permissions**
4. Select: ✅ **Read and write permissions**
5. Check: ✅ **Allow GitHub Actions to create and approve pull requests**
6. Click **Save**

### Solution 2: Make Package Public After First Push

If you get the error on first push:

1. Go to your **GitHub Profile** → **Packages**
2. You might see `care-for-all-gateway` package (if it was created but push failed)
3. Click on the package
4. Go to **Package settings**
5. Scroll to **Danger Zone**
6. Click **Change visibility** → **Public**
7. Re-run the CI workflow

### Solution 3: Use Docker Hub Instead (Alternative)

If you prefer Docker Hub over GitHub Container Registry:

```yaml
- name: Log in to Docker Hub
  uses: docker/login-action@v3
  with:
    username: ${{ secrets.DOCKERHUB_USERNAME }}
    password: ${{ secrets.DOCKERHUB_TOKEN }}

- name: Build and push Docker image
  with:
    tags: |
      ${{ secrets.DOCKERHUB_USERNAME }}/care-for-all-${{ matrix.service }}:latest
      ${{ secrets.DOCKERHUB_USERNAME }}/care-for-all-${{ matrix.service }}:${{ steps.service-info.outputs.version }}
```

Then add Docker Hub credentials to GitHub Secrets:
- `DOCKERHUB_USERNAME` - Your Docker Hub username
- `DOCKERHUB_TOKEN` - Docker Hub access token

## Recommended Solution

**For the hackathon, use Solution 1 with Personal Access Token**:

### Quick Setup

```bash
# 1. Generate GitHub PAT
# Go to: https://github.com/settings/tokens/new
# Select: write:packages, read:packages
# Generate and copy token

# 2. Add to GitHub Secrets
# Repository → Settings → Secrets → New secret
# Name: GHCR_TOKEN
# Value: (paste token)
```

Then the workflow will use:
```yaml
password: ${{ secrets.GHCR_TOKEN }}
```

## Verification

After applying the fix:

```bash
# 1. Push a change
git add .
git commit -m "fix: enable package permissions"
git push

# 2. Watch CI run
# Should see: ✅ Docker images pushed successfully

# 3. Verify packages
# Go to: https://github.com/yourusername?tab=packages
# Should see: care-for-all-gateway, care-for-all-auth-service, etc.
```

## Testing Package Push

### Test Locally

```bash
# 1. Login to ghcr.io
echo $GHCR_TOKEN | docker login ghcr.io -u SrejonKhan --password-stdin

# 2. Build and tag an image
docker build -f apps/backend/gateway/Dockerfile -t ghcr.io/srejonkhan/care-for-all-gateway:test .

# 3. Push
docker push ghcr.io/srejonkhan/care-for-all-gateway:test

# 4. Verify
docker pull ghcr.io/srejonkhan/care-for-all-gateway:test
```

## Alternative: Skip Docker Push for Now

If you want to test CI without Docker push:

### Option A: Comment Out Docker Build Job

```yaml
# In .github/workflows/ci.yml
docker-build:
  # ... job definition
  if: false  # Temporarily disable
```

### Option B: Only Build, Don't Push

```yaml
- name: Build Docker image (no push)
  uses: docker/build-push-action@v5
  with:
    context: .
    file: ${{ steps.service-info.outputs.dockerfile }}
    push: false  # Don't push, just build
    tags: care-for-all-${{ matrix.service }}:latest
```

## Package Visibility

After packages are created, you can:

1. Make them **Public** (free, anyone can pull)
2. Keep them **Private** (only you and collaborators can pull)

For the hackathon:
- **Public** is recommended (judges can pull images if needed)
- No additional authentication needed to pull

## Troubleshooting

### Error: "denied: permission_denied"

**Cause**: GITHUB_TOKEN doesn't have package write permission

**Fix**: Use personal access token (PAT) instead

### Error: "package already exists"

**Cause**: Package was created but you can't push to it

**Fix**: 
1. Delete the package
2. Or change visibility to public
3. Re-run workflow

### Error: "unauthorized: authentication required"

**Cause**: Not logged in to ghcr.io

**Fix**: Check the login step runs before build/push

## Summary

**Quick Fix for Hackathon**:

1. Generate GitHub Personal Access Token with `write:packages`
2. Add as `GHCR_TOKEN` secret
3. Workflow already updated to use lowercase repo owner ✅
4. Push and it should work!

**Alternative for Demo**:
- Skip Docker push (just build locally)
- Use the built images in docker-compose
- Focus on the intelligent CI detection feature

---

**Status**: Issue identified and fix provided ✅

