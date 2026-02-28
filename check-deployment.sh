#!/bin/bash
# Deployment verification script

echo "🔍 Checking deployment readiness..."
echo ""

ERRORS=0

# Check if .env.docker exists
if [ ! -f .env.docker ]; then
    echo "❌ .env.docker not found"
    echo "   Run: cp .env.docker.example .env.docker"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ .env.docker exists"
    
    # Check required variables
    while IFS= read -r line; do
        var=$(echo $line | cut -d'=' -f1)
        val=$(echo $line | cut -d'=' -f2-)
        
        if [ -z "$val" ] || [ "$val" = "your-super-secret-jwt-key-change-in-production-min-32-chars" ] || [ "$val" = "sk-your-openai-key-here" ] || [[ "$val" == *"..."* ]]; then
            echo "⚠️  $var needs to be configured"
            ERRORS=$((ERRORS + 1))
        fi
    done < <(grep -E '^(JWT_SECRET|OPENAI_API_KEY|ADMIN_EMAIL|ADMIN_PASSWORD_HASH|CORS_ORIGIN)=' .env.docker)
fi

echo ""

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Docker is installed ($(docker --version))"
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Docker Compose is installed ($(docker-compose --version))"
fi

echo ""

# Check if ports are available
if command -v netstat &> /dev/null; then
    if netstat -tuln | grep -q ':80 '; then
        echo "⚠️  Port 80 is already in use"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Port 80 is available"
    fi
    
    if netstat -tuln | grep -q ':3000 '; then
        echo "⚠️  Port 3000 is already in use"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Port 3000 is available"
    fi
    
    if netstat -tuln | grep -q ':5432 '; then
        echo "⚠️  Port 5432 is already in use (PostgreSQL)"
        ERRORS=$((ERRORS + 1))
    else
        echo "✅ Port 5432 is available"
    fi
fi

echo ""

# Check docker-compose.yml password
if grep -q "POSTGRES_PASSWORD: m1505" docker-compose.yml; then
    echo "⚠️  Default PostgreSQL password detected in docker-compose.yml"
    echo "   Please change POSTGRES_PASSWORD in docker-compose.yml (lines 9 & 29)"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PostgreSQL password has been changed"
fi

echo ""
echo "================================"

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Ready to deploy."
    echo ""
    echo "Run: docker-compose up -d --build"
    exit 0
else
    echo "❌ Found $ERRORS issue(s). Please fix them before deploying."
    echo ""
    echo "See DEPLOY_VPS.md for detailed instructions"
    exit 1
fi
