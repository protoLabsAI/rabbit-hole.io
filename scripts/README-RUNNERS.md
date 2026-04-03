# GitHub Actions Runner Setup

Quick script to create multiple self-hosted runners on a machine.

## Usage

### 1. Get GitHub Token

Go to: https://github.com/proto-labs-ai/proto-starter/settings/actions/runners/new

Copy the registration token (expires in 1 hour).

### 2. Run Script

```bash
# Create 4 runners (default)
./scripts/setup-github-runners.sh

# Create custom number of runners
./scripts/setup-github-runners.sh 8

# On remote machine
scp scripts/setup-github-runners.sh user@<runner-host>:~
ssh user@<runner-host>
./setup-github-runners.sh 4
```

### 3. Verify

Check: https://github.com/proto-labs-ai/proto-starter/settings/actions/runners

Should see all runners as "Idle" (green).

---

## Management Commands

```bash
# Check status
sudo ~/actions-runners/runner-1/svc.sh status

# Stop runner
sudo ~/actions-runners/runner-1/svc.sh stop

# Start runner
sudo ~/actions-runners/runner-1/svc.sh start

# Stop all runners
for i in {1..4}; do
  sudo ~/actions-runners/runner-$i/svc.sh stop
done

# Start all runners
for i in {1..4}; do
  sudo ~/actions-runners/runner-$i/svc.sh start
done
```

---

## Remove Runners

```bash
# Stop and uninstall
for i in {1..4}; do
  cd ~/actions-runners/runner-$i
  sudo ./svc.sh stop
  sudo ./svc.sh uninstall
  ./config.sh remove --token YOUR_TOKEN
done

# Remove directories
rm -rf ~/actions-runners
```

---

## Recommendations

**32GB RAM machine:** 4 runners
**64GB RAM machine:** 6-8 runners
**128GB RAM machine:** 8-12 runners

Each active Docker build uses ~2-4GB RAM.

---

## pnpm Version Management

**Current Strategy:** `pnpm/action-setup@v3` with explicit version pinning

```yaml
- name: Setup pnpm
  uses: pnpm/action-setup@v3
  with:
    version: 10.14.0
```

**Why v3?** v4 corrupts cache on self-hosted runners (ENOTEMPTY errors). v3 uses stable npm-based installer. See `handoffs/2025-11-13_PNPM_CI_PERMANENT_FIX.md`.

**Cache Management:** pnpm's built-in cache + GitHub Actions `cache: "pnpm"` integration. The `--frozen-lockfile` flag ensures reproducible installs.

**Future:** Consider migrating to Corepack for automatic `packageManager` field enforcement.

---

## Troubleshooting

**Runner shows offline:**
```bash
sudo ~/actions-runners/runner-1/svc.sh status
sudo ~/actions-runners/runner-1/svc.sh start
```

**Check logs:**
```bash
sudo journalctl -u actions.runner.proto-labs-ai-proto-starter.runner-1-* -f
```

**Token expired:**
- Get new token from GitHub
- Re-run script (it will replace existing runners)

**Permission denied:**
```bash
# Ensure user is in docker group
sudo usermod -aG docker $USER
# Log out and back in
```

