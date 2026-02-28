#!/bin/bash
# Quick start script for Docker deployment

set -e

echo "🚀 Starting ocNewsBot with Docker..."
echo ""

# Run pre-deployment checks
if [ -f ./check-deployment.sh ]; then
    echo "Running pre-deployment checks..."
    chmod +x ./check-deployment.sh
    ./check-deployment.sh
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Pre-deployment checks failed. Please fix issues above."
        exit 1
    fi
    echo ""
fi

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "⚠️  .env.docker not found. Creating from template..."
    cp .env.docker.example .env.docker
    echo "✅ Created .env.docker - Please edit it with your actual values!"
    echo "   REQUIRED:"
    echo "   - JWT_SECRET (min 32 chars) - Generate: openssl rand -base64 32"
    echo "   - OPENAI_API_KEY (from platform.openai.com)"
    echo "   - ADMIN_EMAIL (your admin email)"
    echo "   - ADMIN_PASSWORD_HASH (bcrypt hash of password)"
    echo ""
    echo "   To generate password hash:"
    echo "   node -e \"console.log(require('bcrypt').hashSync('your-password', 10))\""
    echo ""
    read -p "Press Enter after editing .env.docker to continue..."
fi

# Load environment variables
export $(cat .env.docker | grep -v '^#' | xargs)

echo "📦 Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Access points:"
echo "   Frontend:  http://localhost"
echo "   Backend:   http://localhost:3000"
echo "   Database:  localhost:5432"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
