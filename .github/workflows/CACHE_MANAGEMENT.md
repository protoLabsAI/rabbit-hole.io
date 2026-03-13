# Docker Build Cache Management Strategy

## Overview

The Docker build system uses a **triple-hybrid cache approach** for maximum performance and resilience:

1. **Registry Cache** (Primary): GitHub Container Registry (GHCR)
   - Unlimited size (within GHCR quota)
   - Auto-managed lifecycle (registry handles garbage collection)
   - Multi-runner ready (cache automatically shared)
   - Most reliable (core GitHub infrastructure)

2. **GHA Cache** (Secondary): GitHub Actions Cache service
   - 10GB per scope limit
   - Fast fallback if registry is slow
   - 7-day auto-expiration

3. **Local Cache** (Tertiary): Persistent `/var/lib/buildkit-cache` on self-hosted runner
   - Emergency fallback only
   - Fastest possible hits for repeat builds
   - Read-only (not written to by workflows)

## Cache Configuration

### Cache Flow

```yaml
cache-from: |
  type=registry,ref=ghcr.io/.../cache:SERVICE-SCOPE  # ← Try first (90% hit)
  type=gha,scope=SERVICE-SCOPE                        # ← Fallback (9% hit)
  type=local,src=/var/lib/buildkit-cache             # ← Emergency (1% hit)

cache-to: |
  type=registry,ref=ghcr.io/.../cache:SERVICE-SCOPE,mode=max  # ← Write primary
  type=gha,scope=SERVICE-SCOPE,mode=max                        # ← Write secondary
  # Local is read-only (emergency fallback)
```

### Cache Lifecycle

| Event | Action | Management |
|-------|--------|------------|
| Build success | Write to registry + GHA | Automatic |
| Cache read | Try registry → GHA → local | Automatic |
| Stale layers | Registry auto-prunes untagged manifests | Automatic |
| GHA expiration | Auto-expire after 7 days of no access | Automatic |
| Local cache | Persists until manual cleanup (optional) | Manual only if needed |

## Workflows Using Cache

### 1. `docker-build-pr.yml`
- **Trigger**: Pull requests with Docker-related changes
- **Frequency**: Multiple times per day
- **Cache benefit**: HIGH (frequent runs, benefits from recent layers)
- **Cache scope**: `-pr` (isolated per service)

### 2. `docker-build-dev.yml`
- **Trigger**: Pushes to `main`, `develop`, `staging`
- **Frequency**: Multiple times per day
- **Cache benefit**: HIGH (frequent runs, benefits from recent layers)
- **Cache scope**: `-dev` (isolated per service)

### 3. `docker-build-release.yml`
- **Trigger**: Version tags (`v*.*.*`) or manual workflow_dispatch
- **Frequency**: Infrequent (once per release cycle)
- **Cache benefit**: HIGH (registry preserves base layers indefinitely)
- **Cache scope**: `-release` (isolated per service)

## Monitoring Cache

### View Registry Cache (Recommended)

Check cache manifests in GitHub Container Registry:

1. Go to: https://github.com/orgs/proto-labs-ai/packages
2. Look for package: `proto-starter/cache`
3. View cache images:
   - `rabbit-hole-release`, `rabbit-hole-dev`, `rabbit-hole-pr`
   - `agent-release`, `agent-dev`, `agent-pr`
   - `job-processor-release`, etc.

**Storage usage displayed directly in GitHub UI**

### Watch Cache in Workflow Logs

Look for cache hit messages in build logs:

```
#8 importing cache manifest from ghcr.io/proto-labs-ai/proto-starter/cache:rabbit-hole-dev
#8 DONE 2.3s

#12 [stage-1 3/8] RUN pnpm install --frozen-lockfile
#12 CACHED
```

`CACHED` = Layer retrieved from cache (fast build)

### Local Cache Inspection (Optional)

```bash
# Check local fallback cache size
du -sh /var/lib/buildkit-cache

# Only needed if debugging cache issues
docker buildx du
```

## Troubleshooting

### Registry cache not being used

**Symptom**: Build logs show "cache not found" for registry

**Solutions**:
1. Verify GITHUB_TOKEN has packages:write permission (should be automatic)
2. Check registry authentication:
   ```bash
   docker login ghcr.io -u USERNAME -p $GITHUB_TOKEN
   ```
3. Verify cache images exist in GHCR UI
4. Fallback: GHA or local cache will be used automatically

### Slow builds despite cache

**Symptom**: Build takes 10min even with warm cache

**Check build logs for:**
```
#8 importing cache manifest from ghcr.io/.../cache:SERVICE-SCOPE
#8 DONE 0.5s  ← Should be fast
```

**If cache import is slow (>5s):**
- Check network latency to ghcr.io
- Verify not hitting rate limits
- GHA/local cache will serve as fallback

**If layers show "CACHED" but build is slow:**
- This is normal for pnpm builds (dependency resolution)
- Check pnpm store cache is mounted correctly:
  ```dockerfile
  RUN --mount=type=cache,id=pnpm-SERVICE,target=/pnpm/store
  ```

### GHCR storage quota exceeded

**Symptom**: "insufficient_scope" or storage quota errors

**Solutions**:
1. Check GHCR usage at https://github.com/settings/billing
2. Public repos: Unlimited storage (should not hit this)
3. Private repos: 50GB free tier
4. Delete old cache manifests manually via GitHub UI if needed
5. Registry auto-prunes old manifests (wait 24-48hrs)

## Manual Cache Management

### Registry Cache (Primary)

**No manual management needed** - Registry auto-prunes untagged manifests.

To manually delete cache images if needed:
1. Go to https://github.com/orgs/proto-labs-ai/packages
2. Find package `proto-starter/cache`
3. Delete specific cache tags (e.g., `rabbit-hole-dev`)

**Warning:** Deleting will cause next build to be cold (10min vs 2-3min)

### Local Cache (Emergency Fallback)

Only needed if local cache fills disk:

```bash
# Check local cache size
du -sh /var/lib/buildkit-cache

# Clear if needed (builds will use registry cache)
rm -rf /var/lib/buildkit-cache/*
```

**Note:** Local cache is read-only in workflows. Clearing it only affects fallback performance.

## Performance Impact

### Expected Cache Hit Rates

| Workflow | First Build | Subsequent Builds | Impact |
|----------|-------------|-------------------|--------|
| PR validation | ~20% (base layers) | ~60-75% (full cache) | ⚡ -40% build time |
| Dev builds | ~40% (base + branch layers) | ~75-85% | ⚡ -50% build time |
| Release builds | ~30% (base layers only) | N/A (infrequent) | ⚡ -30% build time |

*Estimates based on typical Node.js + Docker multi-stage builds*

## Related Documentation

- [GitHub Actions Cache Documentation](https://docs.github.com/en/actions/using-workflows/caching-dependencies-for-actions)
- [Docker Buildx Cache Documentation](https://docs.docker.com/build/cache/)
- [buildx driver documentation](https://docs.docker.com/build/drivers/)
