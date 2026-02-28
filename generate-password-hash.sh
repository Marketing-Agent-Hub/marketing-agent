#!/bin/bash
# Helper script to generate password hash for .env.docker

if [ -z "$1" ]; then
    echo "Usage: ./generate-password-hash.sh <your-password>"
    echo ""
    echo "Example:"
    echo "  ./generate-password-hash.sh mySecurePassword123"
    echo ""
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Navigate to server directory to use bcrypt
cd server

# Check if bcrypt is installed
if [ ! -d "node_modules/bcrypt" ]; then
    echo "📦 bcrypt not installed. Installing..."
    npm install bcrypt --no-save
fi

# Generate hash
echo ""
echo "🔐 Generating bcrypt hash for password: $1"
echo ""
HASH=$(node -e "console.log(require('bcrypt').hashSync('$1', 10))")
echo "Copy this hash to ADMIN_PASSWORD_HASH in .env.docker:"
echo ""
echo "$HASH"
echo ""
