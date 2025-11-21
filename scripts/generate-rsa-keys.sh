#!/bin/bash
# Generate RSA Key Pair for JWT Asymmetric Encryption
# This script generates a 2048-bit RSA key pair for signing and verifying JWT tokens

set -e

KEYS_DIR="keys"
PRIVATE_KEY_FILE="$KEYS_DIR/jwt-private.pem"
PUBLIC_KEY_FILE="$KEYS_DIR/jwt-public.pem"

echo "Generating RSA key pair for JWT authentication..."

# Create keys directory if it doesn't exist
mkdir -p "$KEYS_DIR"

# Generate private key (2048 bits)
echo "Generating private key..."
openssl genrsa -out "$PRIVATE_KEY_FILE" 2048

# Generate public key from private key
echo "Generating public key..."
openssl rsa -in "$PRIVATE_KEY_FILE" -pubout -out "$PUBLIC_KEY_FILE"

# Set appropriate permissions
chmod 600 "$PRIVATE_KEY_FILE"  # Private key: read/write for owner only
chmod 644 "$PUBLIC_KEY_FILE"   # Public key: readable by all

echo "✅ RSA key pair generated successfully!"
echo ""
echo "Private key: $PRIVATE_KEY_FILE"
echo "Public key:  $PUBLIC_KEY_FILE"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Keep the private key secure and never commit it to version control"
echo "   - The public key can be shared with all services"
echo "   - Add $PRIVATE_KEY_FILE to .gitignore"
echo ""
echo "To use in environment variables:"
echo "   JWT_PRIVATE_KEY=\$(cat $PRIVATE_KEY_FILE)"
echo "   JWT_PUBLIC_KEY=\$(cat $PUBLIC_KEY_FILE)"

