#!/bin/bash
set -e

# Setup GitHub Actions Runners
# Usage: ./setup-github-runners.sh [number_of_runners]
#
# Security: Downloads are verified using SHA256 checksums from GitHub releases.
# Checksum URL format: https://github.com/actions/runner/releases/download/v{VERSION}/actions-runner-linux-x64-{VERSION}.tar.gz.sha256

RUNNER_COUNT=${1:-4}
RUNNER_VERSION="2.321.0"
REPO_URL="https://github.com/proto-labs-ai/proto-starter"
BASE_DIR="$HOME/actions-runners"

echo "🚀 GitHub Actions Runner Setup"
echo "================================"
echo "Will create $RUNNER_COUNT runners"
echo "Base directory: $BASE_DIR"
echo ""

# Prompt for token
read -rp "Enter GitHub runner token: " GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
  echo "❌ Error: Token is required"
  exit 1
fi

echo ""
echo "📦 Creating $RUNNER_COUNT runners..."
echo ""

# Create base directory
mkdir -p "$BASE_DIR"

for i in $(seq 1 "$RUNNER_COUNT"); do
  RUNNER_DIR="$BASE_DIR/runner-$i"
  
  echo "[$i/$RUNNER_COUNT] Setting up runner-$i..."
  
  # Create runner directory
  mkdir -p "$RUNNER_DIR"
  cd "$RUNNER_DIR"
  
  # Download runner if not already present
  if [ ! -f "actions-runner-linux-x64.tar.gz" ]; then
    echo "  → Downloading GitHub Actions Runner v${RUNNER_VERSION}..."
    
    RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
    CHECKSUM_URL="${RUNNER_URL}.sha256"
    
    # Download runner tarball
    if ! curl -fsSL -o actions-runner-linux-x64.tar.gz "$RUNNER_URL"; then
      echo "  ❌ Error: Failed to download runner from $RUNNER_URL"
      exit 1
    fi
    
    echo "  → Verifying checksum..."
    # Download checksum file
    # Format: <sha256sum>  actions-runner-linux-x64-<version>.tar.gz
    if ! curl -fsSL -o actions-runner.sha256 "$CHECKSUM_URL"; then
      echo "  ❌ Error: Failed to download checksum from $CHECKSUM_URL"
      rm -f actions-runner-linux-x64.tar.gz
      exit 1
    fi
    
    # Verify checksum
    EXPECTED_CHECKSUM=$(cat actions-runner.sha256 | awk '{print $1}')
    ACTUAL_CHECKSUM=$(sha256sum actions-runner-linux-x64.tar.gz | awk '{print $1}')
    
    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
      echo "  ❌ Error: Checksum verification failed!"
      echo "     Expected: $EXPECTED_CHECKSUM"
      echo "     Got:      $ACTUAL_CHECKSUM"
      rm -f actions-runner-linux-x64.tar.gz actions-runner.sha256
      exit 1
    fi
    
    echo "  ✅ Checksum verified"
    rm -f actions-runner.sha256
  fi
  
  # Extract
  if [ ! -f "config.sh" ]; then
    echo "  → Extracting..."
    tar xzf actions-runner-linux-x64.tar.gz
  fi
  
  # Configure runner
  echo "  → Configuring..."
  ./config.sh \
    --url "$REPO_URL" \
    --token "$GITHUB_TOKEN" \
    --name "runner-$i-$(hostname -s)" \
    --labels self-hosted,linux,x64 \
    --unattended \
    --replace 2>&1 | grep -v "Successfully added the runner"
  
  # Install and start service
  echo "  → Installing as systemd service..."
  sudo ./svc.sh install 2>/dev/null || true
  sudo ./svc.sh start 2>/dev/null || true
  
  # Check status
  if sudo ./svc.sh status 2>/dev/null | grep -q "active (running)"; then
    echo "  ✅ runner-$i is running"
  else
    echo "  ⚠️  runner-$i may not be running (check manually)"
  fi
  
  echo ""
done

echo "✅ Setup complete!"
echo ""
echo "📊 Runner Status:"
echo "----------------"

cd "$BASE_DIR"
for i in $(seq 1 "$RUNNER_COUNT"); do
  RUNNER_DIR="$BASE_DIR/runner-$i"
  if [ -d "$RUNNER_DIR" ]; then
    STATUS=$(sudo "$RUNNER_DIR/svc.sh" status 2>/dev/null | grep -o "active (running)\|inactive" || echo "unknown")
    echo "runner-$i: $STATUS"
  fi
done

echo ""
echo "🔗 Verify in GitHub:"
echo "   $REPO_URL/settings/actions/runners"
echo ""
echo "🛠️  Manage runners:"
echo "   sudo $BASE_DIR/runner-1/svc.sh [start|stop|status]"
echo ""

