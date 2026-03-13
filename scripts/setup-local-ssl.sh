#!/bin/bash

# Setup Local SSL Certificates for HTTPS Development
# Uses mkcert to create locally-trusted certificates

set -e

echo "🔐 Setting up local SSL certificates..."

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo ""
    echo "❌ mkcert is not installed."
    echo ""
    echo "📦 Installing mkcert..."

    # Detect OS and install mkcert
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install mkcert
            brew install nss # for Firefox support
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Please install mkcert manually:"
        echo "  https://github.com/FiloSottile/mkcert#linux"
        exit 1
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install mkcert manually:"
        echo "  https://github.com/FiloSottile/mkcert#installation"
        exit 1
    fi
fi

echo "✅ mkcert is installed"

# Create certificates directory
CERT_DIR="$(pwd)/certs"
mkdir -p "$CERT_DIR"

# Install local CA (certificate authority)
echo ""
echo "📋 Installing local Certificate Authority..."
echo "   (You may be prompted for your password)"
mkcert -install

# Generate certificates for localhost and local IP
echo ""
echo "🔑 Generating SSL certificates..."
echo "   - localhost"
echo "   - 127.0.0.1"
echo "   - ::1"
echo "   - 192.168.4.234"

cd "$CERT_DIR"
mkcert \
  localhost \
  127.0.0.1 \
  ::1 \
  192.168.4.234 \
  "*.local"

# Rename files to standard names
mv localhost+4.pem cert.pem
mv localhost+4-key.pem key.pem

echo ""
echo "✅ SSL certificates generated successfully!"
echo ""
echo "📁 Certificates location: $CERT_DIR"
echo "   - cert.pem (public certificate)"
echo "   - key.pem (private key)"
echo ""
echo "🚀 Next steps:"
echo "   1. Run: pnpm run dev:https"
echo "   2. Open: https://localhost:3000"
echo "   3. Or: https://192.168.4.234:3000"
echo ""
echo "💡 Certificates are trusted by your system browser"
echo "   No more SSL warnings!"

